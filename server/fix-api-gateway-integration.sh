#!/bin/bash

# Fix API Gateway Integration to properly connect to backend

set -e

API_ID="ql3aoaj2x0"
PROXY_ID="qv39ag"
BACKEND_URL="http://107.23.26.219:8081"
AWS_REGION="us-east-1"

echo "🔧 Fixing API Gateway Integration..."
echo "===================================="
echo ""

# Create temporary JSON files for method and integration updates
TEMP_DIR=$(mktemp -d)
METHOD_FILE="${TEMP_DIR}/method.json"
INTEGRATION_FILE="${TEMP_DIR}/integration.json"

# Get current method
echo "Step 1: Getting current method configuration..."
aws apigateway get-method \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --region ${AWS_REGION} > ${METHOD_FILE} 2>&1

# Update method with path parameter
echo "Step 2: Updating method with path parameter..."
cat > ${TEMP_DIR}/update-method.json <<EOF
{
    "requestParameters": {
        "method.request.path.proxy": true
    }
}
EOF

# Use AWS CLI with JSON file (if supported) or provide console instructions
echo "⚠️  CLI update-method doesn't support partial updates easily."
echo "   Using alternative approach..."
echo ""

# Try to delete and recreate method (if needed) or provide console steps
echo "📋 Console Configuration Steps:"
echo "================================="
echo ""
echo "1. Go to API Gateway Console:"
echo "   https://console.aws.amazon.com/apigateway/home?region=${AWS_REGION}#/apis/${API_ID}/resources/${PROXY_ID}/methods/ANY"
echo ""
echo "2. Click on 'ANY' method"
echo ""
echo "3. In 'Method Request' section:"
echo "   - Expand 'URL Path Parameters'"
echo "   - Add: proxy (check 'Required')"
echo "   - Click 'Save'"
echo ""
echo "4. In 'Integration Request' section:"
echo "   - Verify Integration type: HTTP Proxy"
echo "   - Verify Endpoint URL: ${BACKEND_URL}/{proxy}"
echo "   - Expand 'URL Path Parameters'"
echo "   - Add mapping:"
echo "     * Name: proxy"
echo "     * Mapped from: method.request.path.proxy"
echo "   - Click 'Save'"
echo ""
echo "5. Click 'Actions' → 'Deploy API'"
echo "   - Stage: prod"
echo "   - Deploy"
echo ""
echo "6. Test:"
echo "   curl https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod/health"
echo ""

# Alternative: Try using AWS CLI with proper JSON
echo ""
echo "🔄 Attempting automated fix via AWS CLI..."
echo ""

# Delete and recreate method with proper configuration
echo "Deleting existing method..."
aws apigateway delete-method \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --region ${AWS_REGION} 2>&1 || echo "Method may not exist or already deleted"

sleep 2

echo "Creating method with path parameter..."
aws apigateway put-method \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --authorization-type NONE \
    --request-parameters '{"method.request.path.proxy":true}' \
    --region ${AWS_REGION} 2>&1

echo "Creating integration with path mapping..."
aws apigateway put-integration \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --type HTTP_PROXY \
    --integration-http-method ANY \
    --uri "${BACKEND_URL}/{proxy}" \
    --request-parameters '{"integration.request.path.proxy":"method.request.path.proxy"}' \
    --region ${AWS_REGION} 2>&1

echo "Setting up method response..."
aws apigateway put-method-response \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --status-code 200 \
    --region ${AWS_REGION} 2>&1

echo "Setting up integration response..."
aws apigateway put-integration-response \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --status-code 200 \
    --region ${AWS_REGION} 2>&1

echo "Deploying API..."
aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name prod \
    --description "Fixed integration with path mapping" \
    --region ${AWS_REGION} 2>&1

echo ""
echo "✅ Integration updated!"
echo ""
echo "🧪 Testing in 5 seconds..."
sleep 5

INVOKE_URL="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod"
echo "Testing: ${INVOKE_URL}/health"
curl -s "${INVOKE_URL}/health" || echo "Still needs configuration via console"

# Cleanup
rm -rf ${TEMP_DIR}

echo ""
echo "📋 If still not working, follow console steps above."

