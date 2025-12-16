#!/bin/bash

# Automatic API Gateway IP Update Script
# This can be integrated into your CI/CD pipeline or run as a scheduled task

set -e

API_ID="ql3aoaj2x0"
PROXY_ID="qv39ag"
CLUSTER_NAME="fastgraph-cluster"
SERVICE_NAME="fastgraph-gateway-service"
AWS_REGION="us-east-1"
CONTAINER_PORT="8081"

# Function to get current ECS task IP
get_ecs_task_ip() {
    local task_arn=$(aws ecs list-tasks \
        --cluster ${CLUSTER_NAME} \
        --service-name ${SERVICE_NAME} \
        --region ${AWS_REGION} \
        --desired-status RUNNING \
        --query "taskArns[0]" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$task_arn" ] || [ "$task_arn" == "None" ]; then
        echo ""
        return 1
    fi
    
    local eni_id=$(aws ecs describe-tasks \
        --cluster ${CLUSTER_NAME} \
        --tasks ${task_arn} \
        --region ${AWS_REGION} \
        --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$eni_id" ] || [ "$eni_id" == "None" ]; then
        echo ""
        return 1
    fi
    
    local public_ip=$(aws ec2 describe-network-interfaces \
        --network-interface-ids ${eni_id} \
        --region ${AWS_REGION} \
        --query "NetworkInterfaces[0].Association.PublicIp" \
        --output text 2>/dev/null || echo "")
    
    echo "$public_ip"
}

# Function to get current API Gateway backend IP
get_api_gateway_ip() {
    local uri=$(aws apigateway get-integration \
        --rest-api-id ${API_ID} \
        --resource-id ${PROXY_ID} \
        --http-method ANY \
        --region ${AWS_REGION} \
        --query "uri" \
        --output text 2>/dev/null || echo "")
    
    echo "$uri" | grep -oP '\d+\.\d+\.\d+\.\d+' || echo ""
}

# Main logic
echo "🔍 Checking for IP changes..."
echo ""

ECS_IP=$(get_ecs_task_ip)
if [ -z "$ECS_IP" ] || [ "$ECS_IP" == "None" ] || [ "$ECS_IP" == "null" ]; then
    echo "❌ Could not get ECS task IP"
    exit 1
fi

GATEWAY_IP=$(get_api_gateway_ip)

echo "ECS Task IP: ${ECS_IP}"
echo "API Gateway IP: ${GATEWAY_IP}"
echo ""

if [ "$ECS_IP" == "$GATEWAY_IP" ]; then
    echo "✅ IPs match - no update needed"
    exit 0
fi

echo "⚠️  IP mismatch detected!"
echo "   Updating API Gateway integration..."

# Update integration
NEW_BACKEND_URL="http://${ECS_IP}:${CONTAINER_PORT}"
aws apigateway put-integration \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --type HTTP_PROXY \
    --integration-http-method ANY \
    --uri "${NEW_BACKEND_URL}/{proxy}" \
    --request-parameters '{"integration.request.path.proxy":"method.request.path.proxy"}' \
    --region ${AWS_REGION} > /dev/null 2>&1

# Redeploy
aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name prod \
    --description "Auto-updated to IP: ${ECS_IP}" \
    --region ${AWS_REGION} > /dev/null 2>&1

echo "✅ API Gateway updated to ${ECS_IP}"
