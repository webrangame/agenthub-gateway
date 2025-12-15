# Fixing 504 Gateway Timeout for Chat Stream

## Problem

Getting `504 Gateway Timeout` when calling:
```
POST https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/chat/stream
```

## Root Cause

API Gateway HTTP_PROXY has limitations with Server-Sent Events (SSE) streaming:
- Maximum timeout: 29 seconds
- May not properly handle `text/event-stream` responses
- Needs proper integration response configuration

## Solution Applied

### 1. Updated Integration Response

Configured integration response to handle streaming:

```bash
aws apigateway put-integration-response \
  --rest-api-id ql3aoaj2x0 \
  --resource-id qv39ag \
  --http-method ANY \
  --status-code 200 \
  --response-templates '{"text/event-stream":"","application/json":""}'
```

### 2. Verified Backend Response

Backend is correctly configured:
- ✅ Sets SSE headers immediately (line 615-618)
- ✅ Flushes immediately after headers
- ✅ Sends events as they come

### 3. API Gateway Configuration

- ✅ Timeout: 29 seconds (maximum for HTTP_PROXY)
- ✅ Integration response: Configured for streaming
- ✅ API: Redeployed to prod stage

## Testing

### Test Backend Directly

```bash
curl -X POST http://107.23.26.219:8081/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"input":"hello"}' \
  -N
```

**Expected**: Should see SSE events immediately.

### Test Via API Gateway

```bash
curl -X POST https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"input":"hello"}' \
  -N
```

**Expected**: Should work if backend responds quickly.

## If Still Timing Out

### Option 1: Check Backend Processing Time

If backend takes > 20 seconds to start:
- Optimize backend processing
- Send heartbeat immediately
- Process in background

### Option 2: Use API Gateway WebSocket

For very long connections:
- Create WebSocket API
- Better for real-time streaming
- No 29-second limit

### Option 3: Use Direct Backend Connection

If API Gateway continues to timeout:
- Connect directly to backend IP
- Update frontend to use backend URL
- Use proxy routes for CORS

## Backend Code Check

Ensure backend sends immediate response:

```go
// Set SSE headers IMMEDIATELY
c.Writer.Header().Set("Content-Type", "text/event-stream")
c.Writer.Header().Set("Cache-Control", "no-cache")
c.Writer.Header().Set("Connection", "keep-alive")
c.Writer.Flush()  // <-- CRITICAL: Flush immediately

// Send heartbeat within 1-2 seconds
c.SSEvent("status", "processing")
c.Writer.Flush()
```

## Monitoring

Check API Gateway logs:
1. AWS Console → API Gateway → Your API → Logs
2. Look for timeout errors
3. Check response times

Check backend logs:
```bash
aws logs tail /ecs/fastgraph-gateway --follow --region us-east-1
```

## Current Status

- ✅ Integration response configured for streaming
- ✅ Backend sends immediate SSE response
- ✅ API Gateway timeout: 29 seconds (maximum)
- ✅ API redeployed

## Next Steps

1. **Test the endpoint** - Verify it works now
2. **Monitor logs** - Check for any issues
3. **Optimize backend** - If still slow, optimize processing
4. **Consider WebSocket** - If need longer connections
