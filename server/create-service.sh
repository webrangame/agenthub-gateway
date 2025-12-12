#!/bin/bash

set -e

# Configuration
AWS_REGION="us-east-1"
ECS_CLUSTER_NAME="fastgraph-cluster"
ECS_SERVICE_NAME="fastgraph-gateway-service"
ECS_TASK_DEFINITION="fastgraph-gateway"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get default VPC and subnets (you may need to customize these)
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region ${AWS_REGION})
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query "Subnets[*].SubnetId" --output text --region ${AWS_REGION} | tr '\t' ',')

# Get or create security group
SG_NAME="fastgraph-gateway-sg"
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
  --query "SecurityGroups[0].GroupId" \
  --output text \
  --region ${AWS_REGION} 2>/dev/null || echo "")

if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
  echo "🔒 Creating security group..."
  SG_ID=$(aws ec2 create-security-group \
    --group-name ${SG_NAME} \
    --description "Security group for FastGraph Gateway" \
    --vpc-id ${VPC_ID} \
    --region ${AWS_REGION} \
    --query "GroupId" \
    --output text)
  
  # Allow inbound traffic on port 8081
  aws ec2 authorize-security-group-ingress \
    --group-id ${SG_ID} \
    --protocol tcp \
    --port 8081 \
    --cidr 0.0.0.0/0 \
    --region ${AWS_REGION} || echo "Rule may already exist"
fi

echo "🚀 Creating ECS service..."

# Check if service already exists
if aws ecs describe-services \
  --cluster ${ECS_CLUSTER_NAME} \
  --services ${ECS_SERVICE_NAME} \
  --region ${AWS_REGION} \
  --query "services[0].status" \
  --output text 2>/dev/null | grep -q "ACTIVE"; then
  echo "Service already exists. Updating..."
  aws ecs update-service \
    --cluster ${ECS_CLUSTER_NAME} \
    --service ${ECS_SERVICE_NAME} \
    --task-definition ${ECS_TASK_DEFINITION} \
    --force-new-deployment \
    --region ${AWS_REGION}
else
  echo "Creating new service..."
  aws ecs create-service \
    --cluster ${ECS_CLUSTER_NAME} \
    --service-name ${ECS_SERVICE_NAME} \
    --task-definition ${ECS_TASK_DEFINITION} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
    --region ${AWS_REGION}
fi

echo "✅ Service created/updated!"
echo "📊 Check service status:"
echo "   aws ecs describe-services --cluster ${ECS_CLUSTER_NAME} --services ${ECS_SERVICE_NAME} --region ${AWS_REGION}"

