#!/bin/bash

# Script to automatically update Vercel environment variable with current ECS task IP
# Run this whenever the ECS service restarts and gets a new IP

set -e

AWS_REGION="us-east-1"
CLUSTER_NAME="fastgraph-cluster"
SERVICE_NAME="fastgraph-gateway-service"

echo "🔍 Getting current ECS task IP..."

# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster ${CLUSTER_NAME} \
  --service-name ${SERVICE_NAME} \
  --region ${AWS_REGION} \
  --query "taskArns[0]" \
  --output text)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
  echo "❌ No running tasks found"
  exit 1
fi

# Get ENI ID
ENI_ID=$(aws ecs describe-tasks \
  --cluster ${CLUSTER_NAME} \
  --tasks ${TASK_ARN} \
  --region ${AWS_REGION} \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" \
  --output text)

# Get Public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids ${ENI_ID} \
  --region ${AWS_REGION} \
  --query "NetworkInterfaces[0].Association.PublicIp" \
  --output text)

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ]; then
  echo "❌ Could not get public IP"
  exit 1
fi

API_URL="http://${PUBLIC_IP}:8081"

echo "✅ Current IP: ${PUBLIC_IP}"
echo "📡 API URL: ${API_URL}"

# Test if API is reachable
echo "🧪 Testing API..."
if curl -s --max-time 5 ${API_URL}/health > /dev/null; then
  echo "✅ API is reachable"
else
  echo "⚠️  Warning: API health check failed"
fi

# Update Vercel environment variable
echo "🔄 Updating Vercel environment variable..."
cd client-next

# Remove old value
vercel env rm BACKEND_API_URL production --yes 2>/dev/null || true

# Add new value
echo "${API_URL}" | vercel env add BACKEND_API_URL production

echo ""
echo "✅ Updated BACKEND_API_URL to: ${API_URL}"
echo ""
echo "⚠️  Note: This IP will change when the ECS task restarts."
echo "💡 Consider setting up an Application Load Balancer for a stable endpoint."

