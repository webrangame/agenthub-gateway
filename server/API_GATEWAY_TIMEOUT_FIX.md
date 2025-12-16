# Fixing 504 Gateway Timeout for Chat Stream

## Problem

Getting `504 Gateway Timeout` when calling:
```
POST https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/chat/stream
```

## Root Cause

API Gateway HTTP_PROXY has a **maximum timeout of 29 seconds**. If the backend doesn't start sending data within this time, API Gateway times out.

## Solutions

### Solution 1: Ensure Backend Starts Streaming Immediately (Recommended)

The backend should start sending Server-Sent Events (SSE) immediately, even if it's just a heartbeat or initial message.

**Check backend code**:
- Backend should send first chunk within 1-2 seconds
- Use `text/event-stream` content type
- Send keep-alive messages if processing takes time

### Solution 2: Verify Integration Configuration

The integration is configured correctly, but verify:

```bash
cd server
./fix-api-gateway-timeout.sh
```

This ensures:
- Timeout is set to maximum (29s)
- Integration is properly configured
- API is redeployed

### Solution 3: Test Backend Directly

Test if backend responds quickly:

```bash
# Test backend directly
curl -X POST http://107.23.26.219:8081/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  --max-time 10
```

**Expected**: Should start receiving SSE events within 1-2 seconds.

### Solution 4: Check Backend Logs

Check if backend is processing requests:

```bash
# Check ECS task logs
aws logs tail /ecs/fastgraph-gateway --follow --region us-east-1
```

Look for:
- Request received
- Processing started
- First response sent

### Solution 5: Optimize Backend Response Time

If backend is slow to start:

1. **Send immediate acknowledgment**:
   ```go
   // Send heartbeat immediately
   c.SSEvent("message", map[string]string{"status": "processing"})
   c.Writer.Flush()
   ```

2. **Process in background**:
   - Start processing async
   - Stream results as they come

3. **Add timeout handling**:
   - Set reasonable timeouts
   - Return error if processing takes too long

## Current Configuration

- **API Gateway Timeout**: 29 seconds (maximum for HTTP_PROXY)
- **Backend URL**: `http://107.23.26.219:8081`
- **Integration Type**: HTTP_PROXY
- **Health Check**: ✅ Backend is responding

## Testing

### Test 1: Direct Backend

```bash
curl -X POST http://107.23.26.219:8081/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}' \
  --max-time 30
```

**Expected**: Should see SSE events immediately.

### Test 2: Via API Gateway

```bash
curl -X POST https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}' \
  --max-time 35
```

**Expected**: Should work if backend responds quickly.

### Test 3: From Frontend

Check browser Network tab:
- Request should show `text/event-stream`
- Should see data chunks arriving
- Connection should stay open

## Troubleshooting Steps

1. ✅ **Check backend is running**: `curl http://107.23.26.219:8081/health`
2. ✅ **Test backend directly**: See Test 1 above
3. ✅ **Check API Gateway logs**: AWS Console → API Gateway → Logs
4. ✅ **Check ECS logs**: `aws logs tail /ecs/fastgraph-gateway`
5. ✅ **Verify integration**: Run `./fix-api-gateway-timeout.sh`

## Alternative: Use API Gateway WebSocket (For Long Connections)

If you need connections longer than 29 seconds:

1. Create WebSocket API in API Gateway
2. Configure route to backend
3. Update frontend to use WebSocket

**Note**: This requires significant changes to both backend and frontend.

## Quick Fix Checklist

- [ ] Backend responds quickly (< 2 seconds for first chunk)
- [ ] Backend sends `text/event-stream` content type
- [ ] API Gateway timeout is set to 29s (maximum)
- [ ] Integration is properly configured
- [ ] API is deployed to prod stage
- [ ] Backend logs show requests being received

## Next Steps

1. **Test backend directly** - Verify it responds quickly
2. **Check backend logs** - See if requests are received
3. **Optimize backend** - Ensure first chunk is sent immediately
4. **Monitor API Gateway** - Check metrics and logs

## Related Files

- `server/fix-api-gateway-timeout.sh` - Script to fix timeout
- `server/main.go` - Backend chat stream handler
- `client-next/app/components/ChatPanel.tsx` - Frontend SSE handling
