#!/bin/bash

# Fix Chat Stream Timeout - Ensure Backend Sends Immediate Response

set -e

API_ID="ql3aoaj2x0"
PROXY_ID="qv39ag"
AWS_REGION="us-east-1"

echo "🔧 Fixing Chat Stream Timeout Issue"
echo "===================================="
echo ""

echo "The issue: API Gateway times out if backend doesn't respond within 29 seconds"
echo "Solution: Ensure backend sends immediate SSE response"
echo ""

echo "Step 1: Verifying integration response configuration..."
# For streaming responses, we need to ensure the integration response is configured correctly
aws apigateway get-integration-response \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --status-code 200 \
    --region ${AWS_REGION} > /dev/null 2>&1

echo "✅ Integration response configured"

echo ""
echo "Step 2: Testing backend response time..."
BACKEND_TEST=$(timeout 3 curl -s -X POST http://107.23.26.219:8081/api/chat/stream \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' \
    -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}s\n" 2>&1 | head -5)

if echo "$BACKEND_TEST" | grep -q "event:"; then
    echo "✅ Backend starts streaming immediately"
else
    echo "⚠️  Backend may be slow to start streaming"
    echo "   Response: $(echo "$BACKEND_TEST" | head -2)"
fi

echo ""
echo "Step 3: Updating integration for streaming support..."
# Ensure integration response allows streaming
aws apigateway put-integration-response \
    --rest-api-id ${API_ID} \
    --resource-id ${PROXY_ID} \
    --http-method ANY \
    --status-code 200 \
    --selection-pattern "" \
    --response-templates '{"text/event-stream":""}' \
    --region ${AWS_REGION} > /dev/null 2>&1

echo "✅ Integration response updated for streaming"

echo ""
echo "Step 4: Redeploying API..."
aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name prod \
    --description "Fixed streaming response handling" \
    --region ${AWS_REGION} > /dev/null 2>&1

echo "✅ API redeployed"

echo ""
echo "📋 Important: Backend Must Send Immediate Response"
echo "==================================================="
echo ""
echo "The backend ChatStreamHandler should:"
echo ""
echo "1. Set SSE headers IMMEDIATELY:"
echo "   c.Writer.Header().Set(\"Content-Type\", \"text/event-stream\")"
echo "   c.Writer.Header().Set(\"Cache-Control\", \"no-cache\")"
echo "   c.Writer.Header().Set(\"Connection\", \"keep-alive\")"
echo "   c.Writer.Flush()  // <-- CRITICAL: Flush immediately"
echo ""
echo "2. Send a heartbeat within 1-2 seconds:"
echo "   c.SSEvent(\"status\", \"processing\")"
echo "   c.Writer.Flush()"
echo ""
echo "3. Then process and stream results"
echo ""
echo "🧪 Test the fix:"
echo "  curl -X POST https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod/api/chat/stream \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\":\"test\"}'"
echo ""
