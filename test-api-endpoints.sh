#!/bin/bash

# Script to test all API endpoints

API_BASE="http://44.200.192.118:8081"

echo "🧪 Testing API Endpoints"
echo "======================="
echo ""
echo "API Base URL: ${API_BASE}"
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check:"
HEALTH=$(curl -s --max-time 5 ${API_BASE}/health)
if [ $? -eq 0 ]; then
  echo "   ✅ Health endpoint working"
  echo "   Response: $(echo $HEALTH | jq -c . 2>/dev/null || echo $HEALTH)"
else
  echo "   ❌ Health endpoint failed"
fi
echo ""

# Test 2: Feed API
echo "2️⃣  Feed API:"
FEED=$(curl -s --max-time 5 ${API_BASE}/api/feed)
if [ $? -eq 0 ]; then
  ITEM_COUNT=$(echo $FEED | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
  echo "   ✅ Feed endpoint working"
  echo "   Items: ${ITEM_COUNT}"
else
  echo "   ❌ Feed endpoint failed"
fi
echo ""

# Test 3: Swagger Docs
echo "3️⃣  Swagger Documentation:"
SWAGGER=$(curl -s --max-time 5 ${API_BASE}/swagger/index.html)
if [ $? -eq 0 ] && echo "$SWAGGER" | grep -q "swagger"; then
  echo "   ✅ Swagger accessible"
  echo "   URL: ${API_BASE}/swagger/index.html"
else
  echo "   ❌ Swagger not accessible"
fi
echo ""

# Test 4: Chat API (streaming)
echo "4️⃣  Chat API (Streaming):"
CHAT_RESPONSE=$(curl -X POST ${API_BASE}/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  --max-time 10 2>&1 | head -3)
if echo "$CHAT_RESPONSE" | grep -q "event:"; then
  echo "   ✅ Chat endpoint working (SSE stream)"
else
  echo "   ⚠️  Chat endpoint response: $(echo "$CHAT_RESPONSE" | head -1)"
fi
echo ""

# Test 5: API Routes Summary
echo "📋 Available Endpoints:"
echo "   - Health: ${API_BASE}/health"
echo "   - Feed: ${API_BASE}/api/feed"
echo "   - Chat: ${API_BASE}/api/chat/stream"
echo "   - Swagger: ${API_BASE}/swagger/index.html"
echo ""

echo "✅ API Testing Complete!"



