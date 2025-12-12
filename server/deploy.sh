#!/bin/bash

set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REPO_NAME="fastgraph-gateway"
ECS_CLUSTER_NAME="fastgraph-cluster"
ECS_SERVICE_NAME="fastgraph-gateway-service"
ECS_TASK_DEFINITION="fastgraph-gateway"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

echo "🚀 Starting deployment to AWS Fargate..."

# Step 1: Login to ECR
echo "📦 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO_URI}

# Step 2: Create ECR repository if it doesn't exist
echo "📦 Creating ECR repository if needed..."
aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} || \
  aws ecr create-repository --repository-name ${ECR_REPO_NAME} --region ${AWS_REGION}

# Step 3: Build Docker image
echo "🔨 Building Docker image..."
docker build -t ${ECR_REPO_NAME}:latest .

# Step 4: Tag image
echo "🏷️  Tagging image..."
docker tag ${ECR_REPO_NAME}:latest ${ECR_REPO_URI}:latest

# Step 5: Push to ECR
echo "⬆️  Pushing image to ECR..."
docker push ${ECR_REPO_URI}:latest

# Step 6: Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster ${ECS_CLUSTER_NAME} \
  --service ${ECS_SERVICE_NAME} \
  --force-new-deployment \
  --region ${AWS_REGION}

echo "✅ Deployment complete!"
echo "📊 Check service status:"
echo "   aws ecs describe-services --cluster ${ECS_CLUSTER_NAME} --services ${ECS_SERVICE_NAME} --region ${AWS_REGION}"

