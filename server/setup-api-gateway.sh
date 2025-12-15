#!/bin/bash

# AWS API Gateway Setup Script for FastGraph Gateway
# This creates an API Gateway that proxies to your ECS service

set -e

AWS_REGION="us-east-1"
API_NAME="fastgraph-gateway-api"
API_DESCRIPTION="FastGraph Gateway API with HTTPS"
BACKEND_URL="http://107.23.26.219:8081"
DOMAIN_NAME="agentgateway.niyogen.com"

echo "🚀 Setting up AWS API Gateway..."
echo "================================="
echo ""
echo "API Name: ${API_NAME}"
echo "Backend URL: ${BACKEND_URL}"
echo "Domain: ${DOMAIN_NAME}"
echo "Region: ${AWS_REGION}"
echo ""

# Check if API Gateway service is available
echo "Step 1: Checking API Gateway service availability..."
if aws apigateway get-rest-apis --region ${AWS_REGION} > /dev/null 2>&1; then
    echo "✅ API Gateway service is available"
else
    echo "❌ API Gateway service may not be available or you don't have permissions"
    echo "   Error details:"
    aws apigateway get-rest-apis --region ${AWS_REGION} 2>&1 | head -5
    exit 1
fi

# Check for existing API
echo ""
echo "Step 2: Checking for existing API..."
EXISTING_API=$(aws apigateway get-rest-apis \
    --region ${AWS_REGION} \
    --query "items[?name=='${API_NAME}'].id" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_API" ] && [ "$EXISTING_API" != "None" ]; then
    echo "✅ Found existing API: ${EXISTING_API}"
    API_ID="$EXISTING_API"
    read -p "Do you want to use existing API or create new? (use/new): " choice
    if [ "$choice" == "new" ]; then
        EXISTING_API=""
    fi
fi

# Create REST API if needed
if [ -z "$EXISTING_API" ] || [ "$EXISTING_API" == "None" ]; then
    echo ""
    echo "Step 3: Creating REST API..."
    API_ID=$(aws apigateway create-rest-api \
        --name ${API_NAME} \
        --description "${API_DESCRIPTION}" \
        --endpoint-configuration types=REGIONAL \
        --region ${AWS_REGION} \
        --query "id" \
        --output text 2>&1)
    
    if [ -z "$API_ID" ] || [ "$API_ID" == "None" ]; then
        echo "❌ Failed to create API Gateway"
        exit 1
    fi
    
    echo "✅ API created: ${API_ID}"
else
    API_ID="$EXISTING_API"
    echo "✅ Using existing API: ${API_ID}"
fi

# Get root resource ID
echo ""
echo "Step 4: Getting root resource..."
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id ${API_ID} \
    --region ${AWS_REGION} \
    --query "items[?path=='/'].id" \
    --output text)

echo "✅ Root resource ID: ${ROOT_RESOURCE_ID}"

# Create proxy resource
echo ""
echo "Step 5: Creating proxy resource..."
PROXY_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id ${API_ID} \
    --parent-id ${ROOT_RESOURCE_ID} \
    --path-part "{proxy+}" \
    --region ${AWS_REGION} \
    --query "id" \
    --output text 2>&1 || echo "")

if [ -z "$PROXY_RESOURCE_ID" ] || [ "$PROXY_RESOURCE_ID" == "None" ]; then
    # Try to get existing proxy resource
    PROXY_RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id ${API_ID} \
        --region ${AWS_REGION} \
        --query "items[?pathPart=='{proxy+}'].id" \
        --output text 2>&1 || echo "")
fi

if [ -n "$PROXY_RESOURCE_ID" ] && [ "$PROXY_RESOURCE_ID" != "None" ]; then
    echo "✅ Proxy resource ID: ${PROXY_RESOURCE_ID}"
else
    echo "⚠️  Could not create/get proxy resource. You may need to create it manually."
fi

echo ""
echo "📋 Next Steps (Manual Configuration Required):"
echo "=============================================="
echo ""
echo "1. Go to API Gateway Console:"
echo "   https://console.aws.amazon.com/apigateway/home?region=${AWS_REGION}#/apis/${API_ID}"
echo ""
echo "2. Create HTTP Integration:"
echo "   - Select the {proxy+} resource"
echo "   - Create ANY method (or GET/POST separately)"
echo "   - Integration type: HTTP"
echo "   - Endpoint URL: ${BACKEND_URL}/{proxy}"
echo "   - Save"
echo ""
echo "3. Deploy API:"
echo "   - Actions → Deploy API"
echo "   - Stage: prod (or create new)"
echo "   - Deploy"
echo ""
echo "4. Get Invoke URL:"
echo "   After deployment, you'll get an invoke URL like:"
echo "   https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod"
echo ""
echo "5. Set up Custom Domain (for HTTPS):"
echo "   - Custom Domain Names → Create"
echo "   - Domain: ${DOMAIN_NAME}"
echo "   - Certificate: Use ACM certificate for ${DOMAIN_NAME}"
echo "   - Base path mapping: Map to your API stage"
echo ""
echo "📝 API Gateway ID: ${API_ID}"
echo "📝 Root Resource ID: ${ROOT_RESOURCE_ID}"
if [ -n "$PROXY_RESOURCE_ID" ] && [ "$PROXY_RESOURCE_ID" != "None" ]; then
    echo "📝 Proxy Resource ID: ${PROXY_RESOURCE_ID}"
fi
echo ""
echo "💡 For automated setup, see: server/API_GATEWAY_SETUP.md"
