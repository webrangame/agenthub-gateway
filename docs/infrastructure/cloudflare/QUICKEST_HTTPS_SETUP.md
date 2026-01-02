# Quickest HTTPS Setup - Cloudflare DNS Proxy (2 Minutes)

## ⚡ Fastest Method - No Installation Required!

This is the **easiest and fastest** way to get HTTPS for your API.

## Step-by-Step (2 Minutes)

### Step 1: Go to Cloudflare Dashboard
1. Open: **https://dash.cloudflare.com/**
2. Sign in (or create free account)
3. Select your domain: **`niyogen.com`**

### Step 2: Add DNS Record
1. Click **"DNS"** in the left sidebar
2. Click **"Add record"** button
3. Fill in:
   - **Type**: `A`
   - **Name**: `agentgateway`
   - **IPv4 address**: `107.23.26.219`
   - **Proxy status**: **Proxied** (orange cloud icon) ← **THIS IS KEY!**
   - **TTL**: Auto
4. Click **"Save"**

### Step 3: Wait 1-2 Minutes
DNS propagation usually takes 1-2 minutes.

### Step 4: Test HTTPS
```bash
curl https://agentgateway.niyogen.com/health
curl https://agentgateway.niyogen.com/api/feed
```

### Step 5: Update Frontend
Update your frontend to use HTTPS:

**Update `client-next/vercel.json`**:
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://agentgateway.niyogen.com",
    "BACKEND_API_URL": "https://agentgateway.niyogen.com",
    "FEED_API_URL": "https://agentgateway.niyogen.com"
  }
}
```

**Update `client-next/app/utils/api.ts`**:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentgateway.niyogen.com';
```

**Update Vercel environment variables**:
```bash
cd client-next
echo "https://agentgateway.niyogen.com" | vercel env add BACKEND_API_URL production
echo "https://agentgateway.niyogen.com" | vercel env add FEED_API_URL production
```

## ✅ Done!

Your API now has HTTPS at: `https://agentgateway.niyogen.com`

## Important Notes

### When ECS IP Changes
If your ECS task restarts and gets a new IP:
1. Go to Cloudflare Dashboard → DNS
2. Edit the `agentgateway` A record
3. Update IP address to new value
4. Save

### Benefits
- ✅ **FREE** - No costs
- ✅ **Automatic HTTPS** - Cloudflare handles SSL
- ✅ **DDoS Protection** - Built-in
- ✅ **Fast** - Cloudflare's global network
- ✅ **Easy** - 2 minutes setup

## Troubleshooting

### DNS Not Resolving
- Wait 5-10 minutes for propagation
- Check record is "Proxied" (orange cloud)
- Verify domain is in Cloudflare

### 502 Bad Gateway
- Check ECS service is running
- Verify IP address is correct
- Test direct: `curl http://107.23.26.219:8081/health`

### Certificate Errors
- Cloudflare provides automatic SSL
- Wait a few minutes for certificate provisioning
- Check SSL/TLS mode in Cloudflare Dashboard

