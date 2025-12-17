#!/bin/bash

# Fix API Gateway Timeout for Chat Stream Endpoint
# Chat streams can take longer than the default 29 second timeout

set -e

API_ID="ql3aoaj2x0"
PROXY_ID="qv39ag"
AWS_REGION="us-east-1"
BACKEND_URL="http://107.23.26.219:8081"

echo "🔧 Fixing API Gateway Timeout for Chat Stream"
echo "=============================================="
echo ""

# Current timeout is 29000ms (29 seconds)
# For streaming endpoints, we need longer timeout
# Maximum is 29000ms for HTTP_PROXY, but we can try to increase it

echo "Step 1: Checking current timeout..."
CURRENT_TIMEOUT=$(aws apigateway get-integration \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --region ${AWS_REGION} \
    --query "timeoutInMillis" \
    --output text 2>/dev/null || echo "29000")

echo "Current timeout: ${CURRENT_TIMEOUT}ms (${CURRENT_TIMEOUT/1000}s)"

# Note: API Gateway HTTP_PROXY has a maximum timeout of 29000ms (29 seconds)
# For longer timeouts, we need to use AWS_PROXY (Lambda) or increase backend timeout
# However, for streaming, we should keep connection alive

echo ""
echo "Step 2: Updating integration with maximum timeout..."
aws apigateway put-integration \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --type HTTP_PROXY \
    --integration-http-method ANY \
    --uri "${BACKEND_URL}/{proxy}" \
    --request-parameters '{"integration.request.path.proxy":"method.request.path.proxy"}' \
    --timeout-in-millis 29000 \
    --region ${AWS_REGION} > /dev/null 2>&1

echo "✅ Integration updated with 29s timeout (maximum for HTTP_PROXY)"

echo ""
echo "Step 3: Checking backend response time..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BACKEND_URL}/health" 2>/dev/null || echo "000")
if [ "$BACKEND_RESPONSE" == "200" ]; then
    echo "✅ Backend is responding"
else
    echo "⚠️  Backend may not be responding (HTTP $BACKEND_RESPONSE)"
    echo "   This could cause timeout issues"
fi

echo ""
echo "Step 4: Redeploying API..."
aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name prod \
    --description "Updated timeout for streaming endpoints" \
    --region ${AWS_REGION} > /dev/null 2>&1

echo "✅ API redeployed"

echo ""
echo "📋 Important Notes:"
echo "==================="
echo ""
echo "⚠️  API Gateway HTTP_PROXY has a maximum timeout of 29 seconds"
echo ""
echo "For chat streaming that takes longer than 29 seconds:"
echo ""
echo "Option 1: Use Server-Sent Events (SSE) with keep-alive"
echo "  - Frontend should handle SSE properly"
echo "  - Connection stays open for streaming"
echo "  - Works within 29s timeout for individual chunks"
echo ""
echo "Option 2: Check backend response time"
echo "  - Backend should start streaming immediately"
echo "  - First chunk should arrive within 5-10 seconds"
echo "  - If backend is slow, optimize it"
echo ""
echo "Option 3: Use WebSocket (if needed)"
echo "  - For very long connections"
echo "  - Requires API Gateway WebSocket API"
echo ""
echo "🧪 Test the endpoint:"
echo "  curl -X POST https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod/api/chat/stream \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\":\"test\"}'"
echo ""

