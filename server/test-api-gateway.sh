#!/bin/bash

# Test API Gateway Connection

API_ID="ql3aoaj2x0"
INVOKE_URL="https://${API_ID}.execute-api.us-east-1.amazonaws.com/prod"
BACKEND_URL="http://107.23.26.219:8081"

echo "🧪 Testing API Gateway Connection"
echo "================================="
echo ""
echo "API Gateway URL: ${INVOKE_URL}"
echo "Backend URL: ${BACKEND_URL}"
echo ""

echo "1. Testing Backend Directly:"
echo "----------------------------"
curl -s -o /dev/null -w "Status: %{http_code}\n" "${BACKEND_URL}/health"
echo ""

echo "2. Testing API Gateway /health:"
echo "-------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${INVOKE_URL}/health")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "Response: $BODY"
echo "HTTP Code: $HTTP_CODE"
echo ""

echo "3. Testing API Gateway /api/feed:"
echo "---------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${INVOKE_URL}/api/feed")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | head -2)
echo "Response (first 2 lines): $BODY"
echo "HTTP Code: $HTTP_CODE"
echo ""

echo "4. Testing with verbose output:"
echo "--------------------------------"
curl -v "${INVOKE_URL}/health" 2>&1 | grep -E "(HTTP|Host|GET|message|error)" | head -5
echo ""

echo "✅ Test Complete"
echo ""
echo "If you see errors, check:"
echo "1. Backend is running: curl ${BACKEND_URL}/health"
echo "2. API Gateway logs in CloudWatch"
echo "3. Integration configuration in console"

