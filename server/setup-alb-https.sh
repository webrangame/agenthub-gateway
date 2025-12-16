#!/bin/bash

# Script to set up Application Load Balancer with HTTPS for FastGraph Gateway
# This provides a stable endpoint and SSL/TLS encryption

set -e

AWS_REGION="us-east-1"
CLUSTER_NAME="fastgraph-cluster"
SERVICE_NAME="fastgraph-gateway-service"
ALB_NAME="fastgraph-gateway-alb"
TARGET_GROUP_NAME="fastgraph-gateway-tg"
CERTIFICATE_DOMAIN=""  # Set this to your domain (e.g., api.yourdomain.com) or leave empty for self-signed

echo "🚀 Setting up Application Load Balancer with HTTPS..."

# Get VPC and subnets
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region ${AWS_REGION})
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query "Subnets[*].SubnetId" --output text --region ${AWS_REGION})
SUBNET_ARRAY=($SUBNET_IDS)

# Get security group
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=fastgraph-gateway-sg" "Name=vpc-id,Values=${VPC_ID}" \
  --query "SecurityGroups[0].GroupId" \
  --output text \
  --region ${AWS_REGION})

if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
  echo "❌ Security group not found. Please run setup-aws.sh first."
  exit 1
fi

# Create ALB security group (allows HTTPS/HTTP from internet)
ALB_SG_NAME="fastgraph-gateway-alb-sg"
ALB_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${ALB_SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
  --query "SecurityGroups[0].GroupId" \
  --output text \
  --region ${AWS_REGION} 2>/dev/null || echo "")

if [ -z "$ALB_SG_ID" ] || [ "$ALB_SG_ID" == "None" ]; then
  echo "🔒 Creating ALB security group..."
  ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name ${ALB_SG_NAME} \
    --description "Security group for FastGraph Gateway ALB" \
    --vpc-id ${VPC_ID} \
    --region ${AWS_REGION} \
    --query "GroupId" \
    --output text)
  
  # Allow HTTP and HTTPS from internet
  aws ec2 authorize-security-group-ingress \
    --group-id ${ALB_SG_ID} \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region ${AWS_REGION} 2>/dev/null || echo "HTTP rule may already exist"
  
  aws ec2 authorize-security-group-ingress \
    --group-id ${ALB_SG_ID} \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region ${AWS_REGION} 2>/dev/null || echo "HTTPS rule may already exist"
  
  echo "✅ ALB security group created: ${ALB_SG_ID}"
fi

# Allow ALB to communicate with ECS tasks
echo "🔓 Updating ECS security group to allow ALB traffic..."
aws ec2 authorize-security-group-ingress \
  --group-id ${SG_ID} \
  --protocol tcp \
  --port 8081 \
  --source-group ${ALB_SG_ID} \
  --region ${AWS_REGION} 2>/dev/null || echo "Rule may already exist"

# Create Target Group
echo "🎯 Creating target group..."
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names ${TARGET_GROUP_NAME} \
  --region ${AWS_REGION} \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text 2>/dev/null || echo "")

if [ -z "$TARGET_GROUP_ARN" ] || [ "$TARGET_GROUP_ARN" == "None" ]; then
  TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name ${TARGET_GROUP_NAME} \
    --protocol HTTP \
    --port 8081 \
    --vpc-id ${VPC_ID} \
    --target-type ip \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region ${AWS_REGION} \
    --query "TargetGroups[0].TargetGroupArn" \
    --output text)
  
  echo "✅ Target group created: ${TARGET_GROUP_ARN}"
else
  echo "✅ Target group already exists: ${TARGET_GROUP_ARN}"
fi

# Create Application Load Balancer
echo "⚖️  Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names ${ALB_NAME} \
  --region ${AWS_REGION} \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text 2>/dev/null || echo "")

if [ -z "$ALB_ARN" ] || [ "$ALB_ARN" == "None" ]; then
  # Use first 2 subnets (ALB requires at least 2 subnets in different AZs)
  ALB_SUBNETS="${SUBNET_ARRAY[0]} ${SUBNET_ARRAY[1]}"
  
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name ${ALB_NAME} \
    --subnets ${ALB_SUBNETS} \
    --security-groups ${ALB_SG_ID} \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region ${AWS_REGION} \
    --query "LoadBalancers[0].LoadBalancerArn" \
    --output text)
  
  echo "✅ Load balancer created: ${ALB_ARN}"
  
  # Wait for ALB to be active
  echo "⏳ Waiting for ALB to become active..."
  aws elbv2 wait load-balancer-available \
    --load-balancer-arns ${ALB_ARN} \
    --region ${AWS_REGION}
  
  echo "✅ ALB is now active"
else
  echo "✅ Load balancer already exists: ${ALB_ARN}"
fi

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ${ALB_ARN} \
  --region ${AWS_REGION} \
  --query "LoadBalancers[0].DNSName" \
  --output text)

echo "🌐 ALB DNS Name: ${ALB_DNS}"

# Get or create SSL certificate
CERT_ARN=""
if [ -n "$CERTIFICATE_DOMAIN" ]; then
  echo "🔐 Looking for SSL certificate for ${CERTIFICATE_DOMAIN}..."
  CERT_ARN=$(aws acm list-certificates \
    --region ${AWS_REGION} \
    --query "CertificateSummaryList[?DomainName=='${CERTIFICATE_DOMAIN}' || DomainName=='*.${CERTIFICATE_DOMAIN#*.}'].CertificateArn" \
    --output text | head -1)
  
  if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
    echo "⚠️  Certificate not found. You'll need to:"
    echo "   1. Request a certificate in ACM: https://console.aws.amazon.com/acm/home?region=${AWS_REGION}#/request"
    echo "   2. Validate the certificate (DNS or email)"
    echo "   3. Update CERTIFICATE_DOMAIN in this script and run again"
    echo ""
    echo "   For now, we'll set up HTTP only. You can add HTTPS listener later."
  fi
fi

# Create HTTP listener (port 80)
echo "📡 Creating HTTP listener (port 80)..."
HTTP_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn ${ALB_ARN} \
  --region ${AWS_REGION} \
  --query "Listeners[?Port==\`80\`].ListenerArn" \
  --output text 2>/dev/null || echo "")

if [ -z "$HTTP_LISTENER" ] || [ "$HTTP_LISTENER" == "None" ]; then
  aws elbv2 create-listener \
    --load-balancer-arn ${ALB_ARN} \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=${TARGET_GROUP_ARN} \
    --region ${AWS_REGION} > /dev/null
  
  echo "✅ HTTP listener created"
else
  echo "✅ HTTP listener already exists"
fi

# Create HTTPS listener (port 443) if certificate is available
if [ -n "$CERT_ARN" ] && [ "$CERT_ARN" != "None" ]; then
  echo "🔒 Creating HTTPS listener (port 443)..."
  HTTPS_LISTENER=$(aws elbv2 describe-listeners \
    --load-balancer-arn ${ALB_ARN} \
    --region ${AWS_REGION} \
    --query "Listeners[?Port==\`443\`].ListenerArn" \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$HTTPS_LISTENER" ] || [ "$HTTPS_LISTENER" == "None" ]; then
    aws elbv2 create-listener \
      --load-balancer-arn ${ALB_ARN} \
      --protocol HTTPS \
      --port 443 \
      --certificates CertificateArn=${CERT_ARN} \
      --default-actions Type=forward,TargetGroupArn=${TARGET_GROUP_ARN} \
      --ssl-policy ELBSecurityPolicy-TLS-1-2-2017-01 \
      --region ${AWS_REGION} > /dev/null
    
    echo "✅ HTTPS listener created with SSL certificate"
  else
    echo "✅ HTTPS listener already exists"
  fi
else
  echo "⚠️  HTTPS listener not created (no certificate). Set up certificate and run again to enable HTTPS."
fi

# Update ECS service to use ALB
echo "🔄 Updating ECS service to use ALB..."
# Note: containerName should match the container name in your task definition
# Check if using 'fastgraph-gateway' or 'guardian-gateway'
CONTAINER_NAME="fastgraph-gateway"
aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --load-balancers targetGroupArn=${TARGET_GROUP_ARN},containerName=${CONTAINER_NAME},containerPort=8081 \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_ID}],assignPublicIp=DISABLED}" \
  --region ${AWS_REGION} > /dev/null

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Summary:"
echo "   ALB DNS: ${ALB_DNS}"
echo "   HTTP: http://${ALB_DNS}"
if [ -n "$CERT_ARN" ] && [ "$CERT_ARN" != "None" ]; then
  echo "   HTTPS: https://${ALB_DNS}"
fi
echo "   Health: http://${ALB_DNS}/health"
echo ""
echo "🔄 Next steps:"
echo "   1. Wait a few minutes for the service to update"
echo "   2. Register ECS tasks with the target group (automatic)"
echo "   3. Test: curl http://${ALB_DNS}/health"
if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
  echo "   4. Request SSL certificate in ACM and update this script to enable HTTPS"
fi
echo ""
echo "📝 Update your frontend API URL to: http://${ALB_DNS} (or https://${ALB_DNS} if HTTPS is enabled)"




