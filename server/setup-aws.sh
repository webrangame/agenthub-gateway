#!/bin/bash

set -e

AWS_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🔧 Setting up AWS resources for FastGraph Gateway..."

# Step 1: Create ECR Repository
echo "📦 Creating ECR repository..."
aws ecr create-repository \
  --repository-name fastgraph-gateway \
  --region ${AWS_REGION} \
  --image-scanning-configuration scanOnPush=true \
  || echo "Repository already exists"

# Step 2: Create CloudWatch Log Group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group \
  --log-group-name /ecs/fastgraph-gateway \
  --region ${AWS_REGION} \
  || echo "Log group already exists"

# Step 3: Create Secrets in Secrets Manager
echo "🔐 Creating secrets in Secrets Manager..."

# OpenAI API Key (from environment variable)
if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️  Warning: OPENAI_API_KEY not set. Please set it before running this script."
  echo "   export OPENAI_API_KEY=your-key-here"
else
  aws secretsmanager create-secret \
    --name fastgraph-gateway/OPENAI_API_KEY \
    --secret-string "${OPENAI_API_KEY}" \
    --region ${AWS_REGION} \
    || aws secretsmanager update-secret \
        --secret-id fastgraph-gateway/OPENAI_API_KEY \
        --secret-string "${OPENAI_API_KEY}" \
        --region ${AWS_REGION}
fi

# Google Maps Key (from environment variable)
if [ -z "$GOOGLE_MAPS_KEY" ]; then
  echo "⚠️  Warning: GOOGLE_MAPS_KEY not set. Skipping..."
else
  aws secretsmanager create-secret \
    --name fastgraph-gateway/GOOGLE_MAPS_KEY \
    --secret-string "${GOOGLE_MAPS_KEY}" \
    --region ${AWS_REGION} \
    || aws secretsmanager update-secret \
        --secret-id fastgraph-gateway/GOOGLE_MAPS_KEY \
        --secret-string "${GOOGLE_MAPS_KEY}" \
        --region ${AWS_REGION}
fi

# AWS Access Key ID (from environment variable)
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
  echo "⚠️  Warning: AWS_ACCESS_KEY_ID not set. Skipping..."
else
  aws secretsmanager create-secret \
    --name fastgraph-gateway/AWS_ACCESS_KEY_ID \
    --secret-string "${AWS_ACCESS_KEY_ID}" \
    --region ${AWS_REGION} \
    || aws secretsmanager update-secret \
        --secret-id fastgraph-gateway/AWS_ACCESS_KEY_ID \
        --secret-string "${AWS_ACCESS_KEY_ID}" \
        --region ${AWS_REGION}
fi

# AWS Secret Access Key (from environment variable)
if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "⚠️  Warning: AWS_SECRET_ACCESS_KEY not set. Skipping..."
else
  aws secretsmanager create-secret \
    --name fastgraph-gateway/AWS_SECRET_ACCESS_KEY \
    --secret-string "${AWS_SECRET_ACCESS_KEY}" \
    --region ${AWS_REGION} \
    || aws secretsmanager update-secret \
        --secret-id fastgraph-gateway/AWS_SECRET_ACCESS_KEY \
        --secret-string "${AWS_SECRET_ACCESS_KEY}" \
        --region ${AWS_REGION}
fi

# Step 4: Create ECS Cluster
echo "🚀 Creating ECS cluster..."
aws ecs create-cluster \
  --cluster-name fastgraph-cluster \
  --region ${AWS_REGION} \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  || echo "Cluster already exists"

# Step 5: Create VPC and Networking (if needed)
echo "🌐 Note: Make sure you have a VPC, subnets, and security group configured."
echo "   The security group should allow inbound traffic on port 8081."

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update ecs-task-definition.json with your ACCOUNT_ID: ${ACCOUNT_ID}"
echo "2. Create IAM roles for ECS task execution and task role"
echo "3. Create Application Load Balancer (optional but recommended)"
echo "4. Run ./deploy.sh to build and deploy"

