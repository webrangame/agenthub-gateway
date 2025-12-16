#!/bin/bash

# Update API Gateway Integration with New ECS Task IP
# This script should be run after ECS deployment to update API Gateway

set -e

API_ID="ql3aoaj2x0"
PROXY_ID="qv39ag"
CLUSTER_NAME="fastgraph-cluster"
SERVICE_NAME="fastgraph-gateway-service"
AWS_REGION="us-east-1"
CONTAINER_PORT="8081"

echo "🔄 Updating API Gateway Integration with New ECS Task IP"
echo "========================================================"
echo ""

# Get the running task ARN
echo "Step 1: Finding running ECS task..."
TASK_ARN=$(aws ecs list-tasks \
    --cluster ${CLUSTER_NAME} \
    --service-name ${SERVICE_NAME} \
    --region ${AWS_REGION} \
    --desired-status RUNNING \
    --query "taskArns[0]" \
    --output text 2>/dev/null || echo "")

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
    echo "❌ No running tasks found for service ${SERVICE_NAME}"
    echo "   Please check your cluster and service names"
    exit 1
fi

echo "✅ Found task: ${TASK_ARN}"

# Get the ENI ID from the task
echo ""
echo "Step 2: Getting network interface..."
ENI_ID=$(aws ecs describe-tasks \
    --cluster ${CLUSTER_NAME} \
    --tasks ${TASK_ARN} \
    --region ${AWS_REGION} \
    --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" \
    --output text 2>/dev/null || echo "")

if [ -z "$ENI_ID" ] || [ "$ENI_ID" == "None" ]; then
    echo "❌ Could not get network interface ID"
    exit 1
fi

echo "✅ Network Interface: ${ENI_ID}"

# Get the public IP from the ENI
echo ""
echo "Step 3: Getting public IP address..."
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
    --network-interface-ids ${ENI_ID} \
    --region ${AWS_REGION} \
    --query "NetworkInterfaces[0].Association.PublicIp" \
    --output text 2>/dev/null || echo "")

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ] || [ "$PUBLIC_IP" == "null" ]; then
    echo "❌ Could not get public IP address"
    echo "   Task may not have a public IP, or ENI association is missing"
    exit 1
fi

echo "✅ Public IP: ${PUBLIC_IP}"

# Construct new backend URL
NEW_BACKEND_URL="http://${PUBLIC_IP}:${CONTAINER_PORT}"
echo ""
echo "Step 4: New backend URL: ${NEW_BACKEND_URL}"

# Get current integration to check if update is needed
echo ""
echo "Step 5: Checking current API Gateway integration..."
CURRENT_URI=$(aws apigateway get-integration \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --region ${AWS_REGION} \
    --query "uri" \
    --output text 2>/dev/null || echo "")

echo "Current URI: ${CURRENT_URI}"
echo "New URI: ${NEW_BACKEND_URL}/{proxy}"

# Check if update is needed
if [[ "$CURRENT_URI" == *"${PUBLIC_IP}"* ]]; then
    echo ""
    echo "✅ API Gateway already points to ${PUBLIC_IP}"
    echo "   No update needed!"
    exit 0
fi

# Update the integration
echo ""
echo "Step 6: Updating API Gateway integration..."
aws apigateway put-integration \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --type HTTP_PROXY \
    --integration-http-method ANY \
    --uri "${NEW_BACKEND_URL}/{proxy}" \
    --request-parameters '{"integration.request.path.proxy":"method.request.path.proxy"}' \
    --region ${AWS_REGION} > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Integration updated successfully"
else
    echo "❌ Failed to update integration"
    exit 1
fi

# Redeploy API
echo ""
echo "Step 7: Redeploying API Gateway..."
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name prod \
    --description "Updated to new ECS IP: ${PUBLIC_IP}" \
    --region ${AWS_REGION} \
    --query "id" \
    --output text 2>/dev/null)

if [ -n "$DEPLOYMENT_ID" ]; then
    echo "✅ API deployed (ID: ${DEPLOYMENT_ID})"
else
    echo "⚠️  Deployment may have failed"
fi

# Test the connection
echo ""
echo "Step 8: Testing connection..."
sleep 3
INVOKE_URL="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${INVOKE_URL}/health" || echo "000")

if [ "$RESPONSE" == "200" ]; then
    echo "✅ Connection test successful (HTTP ${RESPONSE})"
else
    echo "⚠️  Connection test returned HTTP ${RESPONSE}"
    echo "   This may be normal if the task is still starting up"
fi

echo ""
echo "✅ API Gateway Integration Updated!"
echo ""
echo "📊 Summary:"
echo "   Old IP: $(echo ${CURRENT_URI} | grep -oP '\d+\.\d+\.\d+\.\d+' || echo 'N/A')"
echo "   New IP: ${PUBLIC_IP}"
echo "   Backend URL: ${NEW_BACKEND_URL}"
echo "   API Gateway: ${INVOKE_URL}"
echo ""
echo "🧪 Test:"
echo "   curl ${INVOKE_URL}/health"

