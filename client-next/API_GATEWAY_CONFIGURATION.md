# API Gateway Configuration for client-next

## ✅ Configuration Complete

All client-next endpoints have been updated to use AWS API Gateway.

## 📋 Updated Files

1. **`app/utils/api.ts`**
   - Updated `API_BASE_URL` default to API Gateway
   - Endpoints now use: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod`

2. **`vercel.json`**
   - Updated all environment variables:
     - `NEXT_PUBLIC_API_URL`
     - `BACKEND_API_URL`
     - `FEED_API_URL`

3. **`app/api/proxy/feed/route.ts`**
   - Updated fallback URL to API Gateway

4. **`app/api/proxy/chat/route.ts`**
   - Updated fallback URL to API Gateway

5. **`app/api/proxy/upload/route.ts`**
   - Updated fallback URL to API Gateway

6. **`app/components/FeedPanel.tsx`**
   - Updated error message to show API Gateway URL

7. **`.github/workflows/deploy-client-next.yml`**
   - Updated build environment variables

## 🌐 API Gateway Endpoints

All endpoints are now accessible via API Gateway:

- **Health**: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/health`
- **Feed**: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/feed`
- **Chat Stream**: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/chat/stream`
- **Upload**: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/agent/upload`

## 🔄 How It Works

### Local Development

- Uses proxy routes (`/api/proxy/*`) to avoid CORS issues
- Proxy routes forward to API Gateway
- No direct connection to backend IP needed

### Production (Vercel)

- Uses API Gateway directly (HTTPS)
- Environment variables in `vercel.json` ensure correct URLs
- No proxy needed (API Gateway handles CORS)

## 📝 Environment Variables

### Vercel Configuration

The following environment variables are set in `vercel.json`:

```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod",
    "BACKEND_API_URL": "https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod",
    "FEED_API_URL": "https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod"
  }
}
```

### Override for Different Environments

You can override these in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add/Update variables for Production, Preview, or Development
3. Redeploy

## 🧪 Testing

### Test API Gateway Endpoints

```bash
# Health check
curl https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/health

# Feed endpoint
curl https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/feed

# Chat endpoint (POST)
curl -X POST https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### Test Local Development

```bash
cd client-next
npm run dev
```

Visit `http://localhost:3000` and test:
- Chat functionality
- Feed display
- File upload

## ⚠️ Important Notes

### IP Address Changes

**Note**: If you redeploy your ECS service, the backend IP will change. However, since we're using API Gateway, you don't need to update the frontend - API Gateway will continue to work.

**If API Gateway integration breaks** (rare), run:
```bash
cd server
./update-api-gateway-ip.sh
```

### CORS

API Gateway should handle CORS automatically. If you encounter CORS issues:
1. Check API Gateway CORS configuration
2. Verify frontend domain is allowed
3. Check browser console for specific CORS errors

## 🔄 Migration from Direct IP

Previously, the frontend connected directly to:
- `http://107.23.26.219:8081`

Now it connects via API Gateway:
- `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod`

**Benefits**:
- ✅ HTTPS (secure)
- ✅ Stable endpoint (doesn't change with redeployments)
- ✅ Better error handling
- ✅ Managed by AWS

## 📊 Next Steps

1. ✅ **Deploy to Vercel** - Push changes and deploy
2. ✅ **Test endpoints** - Verify all API calls work
3. ✅ **Monitor** - Check API Gateway metrics in AWS Console
4. ⚠️ **Set up custom domain** (optional) - Use `agentgateway.niyogen.com` via API Gateway custom domain

## 🔗 Related Documentation

- `server/API_GATEWAY_CONNECTED.md` - API Gateway setup status
- `server/API_GATEWAY_IP_MANAGEMENT.md` - Managing IP changes
- `server/update-api-gateway-ip.sh` - Script to update API Gateway IP
