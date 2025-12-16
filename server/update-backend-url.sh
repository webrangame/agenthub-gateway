#!/bin/bash

# Update Vercel environment variable with new backend IP
# Run this after ECS redeployment

set -e

CLUSTER_NAME="fastgraph-cluster"
SERVICE_NAME="fastgraph-gateway-service"
AWS_REGION="us-east-1"
CONTAINER_PORT="8081"

echo "🔄 Updating Backend Direct URL in Vercel"
echo "========================================="
echo ""

# Get current ECS task IP
echo "Step 1: Getting current ECS task IP..."
TASK_ARN=$(aws ecs list-tasks \
    --cluster ${CLUSTER_NAME} \
    --service-name ${SERVICE_NAME} \
    --region ${AWS_REGION} \
    --desired-status RUNNING \
    --query "taskArns[0]" \
    --output text 2>/dev/null || echo "")

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
    echo "❌ No running tasks found"
    exit 1
fi

ENI_ID=$(aws ecs describe-tasks \
    --cluster ${CLUSTER_NAME} \
    --tasks ${TASK_ARN} \
    --region ${AWS_REGION} \
    --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" \
    --output text 2>/dev/null || echo "")

PUBLIC_IP=$(aws ec2 describe-network-interfaces \
    --network-interface-ids ${ENI_ID} \
    --region ${AWS_REGION} \
    --query "NetworkInterfaces[0].Association.PublicIp" \
    --output text 2>/dev/null || echo "")

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ] || [ "$PUBLIC_IP" == "null" ]; then
    echo "❌ Could not get public IP"
    exit 1
fi

BACKEND_URL="http://${PUBLIC_IP}:${CONTAINER_PORT}"
echo "✅ Current Backend IP: ${PUBLIC_IP}"
echo "✅ Backend URL: ${BACKEND_URL}"

echo ""
echo "Step 2: Updating Vercel environment variable..."
echo ""
echo "⚠️  Manual Steps Required:"
echo "=========================="
echo ""
echo "1. Go to Vercel Dashboard: https://vercel.com"
echo "2. Select your project"
echo "3. Go to: Settings → Environment Variables"
echo "4. Add/Update:"
echo "   - Name: NEXT_PUBLIC_BACKEND_DIRECT_URL"
echo "   - Value: ${BACKEND_URL}"
echo "   - Environment: Production, Preview, Development"
echo "5. Redeploy the application"
echo ""
echo "Or use Vercel CLI:"
echo "  cd client-next"
echo "  echo '${BACKEND_URL}' | vercel env add NEXT_PUBLIC_BACKEND_DIRECT_URL production"
echo "  vercel --prod"
echo ""
