#!/bin/bash

# Enable CORS in API Gateway for direct browser access

set -e

API_ID="ql3aoaj2x0"
PROXY_ID="qv39ag"
AWS_REGION="us-east-1"

echo "🔧 Enabling CORS in API Gateway..."
echo "=================================="
echo ""

# Create OPTIONS method for CORS preflight
echo "Step 1: Creating OPTIONS method..."
aws apigateway put-method \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region ${AWS_REGION} 2>&1 || echo "OPTIONS method may already exist"

# Create mock integration for OPTIONS
echo "Step 2: Creating mock integration for OPTIONS..."
aws apigateway put-integration \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' \
    --region ${AWS_REGION} 2>&1 || echo "Integration may already exist"

# Set up method response with CORS headers
echo "Step 3: Setting up method response with CORS headers..."
aws apigateway put-method-response \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true,"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true}' \
    --region ${AWS_REGION} 2>&1

# Set up integration response with CORS headers
echo "Step 4: Setting up integration response with CORS headers..."
aws apigateway put-integration-response \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'\''*'\''","method.response.header.Access-Control-Allow-Headers":"'\''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\''","method.response.header.Access-Control-Allow-Methods":"'\''GET,POST,PUT,DELETE,OPTIONS'\''"}' \
    --response-templates '{"application/json":""}' \
    --region ${AWS_REGION} 2>&1

# Add CORS headers to existing methods (ANY, GET, POST, etc.)
echo "Step 5: Adding CORS headers to integration responses..."
for METHOD in ANY GET POST PUT DELETE; do
    echo "  Updating ${METHOD} method..."
    aws apigateway put-integration-response \
        --rest-api-id ${API_ID} \
        --resource-id ${PROXY_ID} \
        --http-method ${METHOD} \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'\''*'\''"}' \
        --region ${AWS_REGION} 2>&1 || echo "    ${METHOD} may not exist or already configured"
done

# Deploy API
echo ""
echo "Step 6: Deploying API..."
aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name prod \
    --description "Enabled CORS for direct browser access" \
    --region ${AWS_REGION} 2>&1

echo ""
echo "✅ CORS enabled in API Gateway!"
echo ""
echo "📋 CORS Configuration:"
echo "   Access-Control-Allow-Origin: *"
echo "   Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS"
echo "   Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key"
echo ""
echo "🧪 Test CORS:"
echo "   curl -X OPTIONS https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod/health \\"
echo "     -H 'Origin: https://your-frontend-domain.com' \\"
echo "     -H 'Access-Control-Request-Method: GET' \\"
echo "     -v"
