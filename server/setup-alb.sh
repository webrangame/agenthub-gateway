#!/bin/bash
set -e

# Default Configuration
AWS_PROFILE="niyogen_aws_official"
AWS_REGION="us-east-1"
VPC_ID="vpc-07d3fbd9a2fad7114"
SUBNETS="subnet-08045516e5615a6aa subnet-08f2ca560ce78af06"

# Check for Certificate ARN
if [ -z "$1" ]; then
  echo "❌ Error: Certificate ARN is required."
  echo "Usage: ./setup-alb.sh <arn:aws:acm:us-east-1:...>"
  echo "Get your ARN from AWS Certificate Manager (ACM)."
  exit 1
fi

CERT_ARN=$1

echo "🚀 Configuring AWS ALB for HTTPS..."
echo "Using Profile: $AWS_PROFILE"
echo "Using Cert: $CERT_ARN"

# 1. Create Target Group
echo "Creating Target Group..."
TG_ARN=$(aws elbv2 create-target-group \
    --name fastgraph-tg \
    --protocol HTTP \
    --port 8080 \
    --target-type ip \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query "TargetGroups[0].TargetGroupArn" \
    --output text)
echo "✅ Target Group Created: $TG_ARN"

# 2. Create Load Balancer
echo "Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name fastgraph-alb \
    --subnets $SUBNETS \
    --security-groups $(aws ec2 describe-security-groups --filters Name=vpc-id,Values=$VPC_ID --query "SecurityGroups[0].GroupId" --output text --profile $AWS_PROFILE) \
    --scheme internet-facing \
    --type application \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query "LoadBalancers[0].LoadBalancerArn" \
    --output text)
echo "✅ Load Balancer Created: $ALB_ARN"

# 3. Create Listener (HTTPS)
echo "Creating HTTPS Listener..."
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $AWS_REGION \
    --profile $AWS_PROFILE

echo "✅ Listener Created!"
echo "🎉 HTTPS is configured! Update your ECS Service to use this Load Balancer."
