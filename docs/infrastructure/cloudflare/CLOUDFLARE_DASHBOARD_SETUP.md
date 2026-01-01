# Cloudflare Tunnel Setup via Dashboard - Step by Step

## Quick Setup Guide

Since your AWS account can't create load balancers, Cloudflare Tunnel is the perfect **FREE** solution for HTTPS.

## Prerequisites

- Cloudflare account (free): https://dash.cloudflare.com/sign-up
- Domain `niyogen.com` added to Cloudflare
- Current ECS IP: `107.23.26.219:8081`

## Step-by-Step Dashboard Setup

### Step 1: Access Cloudflare Zero Trust

1. Go to: **https://one.dash.cloudflare.com/**
2. Sign in with your Cloudflare account
3. If you don't have Zero Trust access, you'll be prompted to set it up (free tier available)

### Step 2: Navigate to Tunnels

1. In the left sidebar, click **"Networks"**
2. Click **"Tunnels"**
3. You should see the tunnels page

### Step 3: Create a Tunnel

1. Click the **"Create a tunnel"** button (top right)
2. Select **"Cloudflared"** as the connector type
3. Enter tunnel name: **`fastgraph-gateway-tunnel`**
4. Click **"Save tunnel"**

### Step 4: Install Connector (Optional - for local testing)

If you want to test locally, you can install the connector. For production, we'll use the managed connector.

**Skip this step if you just want to configure the tunnel.**

### Step 5: Configure Public Hostname

1. After creating the tunnel, you'll see the tunnel details page
2. Click on the **"Configure"** tab
3. In the **"Public Hostname"** section, click **"Add a public hostname"**
4. Fill in the form:
   - **Subdomain**: `agentgateway`
   - **Domain**: Select `niyogen.com` from dropdown
   - **Service**: `http://107.23.26.219:8081`
   - **Path**: (leave empty)
5. Click **"Save hostname"**

### Step 6: Deploy Connector

1. Go back to the tunnel overview
2. You'll see your tunnel listed
3. The tunnel should show as **"Healthy"** once connected
4. If using managed connector, Cloudflare will handle the connection automatically

### Step 7: Verify DNS

1. Go to Cloudflare Dashboard → **DNS** → **Records**
2. You should see a CNAME record automatically created:
   - **Type**: CNAME
   - **Name**: `agentgateway`
   - **Target**: `<tunnel-id>.cfargotunnel.com`
   - **Proxy status**: Proxied (orange cloud)

### Step 8: Test HTTPS

Wait 1-2 minutes for DNS propagation, then test:

```bash
# Test health endpoint
curl https://agentgateway.niyogen.com/health

# Test API feed
curl https://agentgateway.niyogen.com/api/feed

# Test with verbose output
curl -v https://agentgateway.niyogen.com/health
```

## Alternative: Automated Script

If you prefer command-line setup, you can use:

```bash
cd server
./automate-cloudflare-tunnel.sh
```

This script will:
- Install cloudflared (if needed)
- Authenticate with Cloudflare
- Create the tunnel
- Configure DNS routing
- Set up the config file

## Troubleshooting

### Tunnel Not Connecting

1. **Check tunnel status** in Cloudflare Dashboard
2. **Verify service is running**: `curl http://107.23.26.219:8081/health`
3. **Check DNS records** are correct
4. **Verify domain** is added to Cloudflare

### DNS Not Resolving

1. Wait 5-10 minutes for DNS propagation
2. Check DNS records in Cloudflare Dashboard
3. Verify CNAME record exists for `agentgateway.niyogen.com`
4. Ensure proxy is enabled (orange cloud icon)

### 502 Bad Gateway

1. Verify ECS service is running
2. Check IP address is correct: `107.23.26.219:8081`
3. Test direct connection: `curl http://107.23.26.219:8081/health`
4. Check security groups allow traffic

### Certificate Errors

- Cloudflare provides automatic SSL certificates
- If you see certificate errors, wait a few minutes for certificate provisioning
- Check SSL/TLS encryption mode in Cloudflare Dashboard → SSL/TLS

## Handling IP Changes

**Problem**: When ECS task restarts, IP may change from `107.23.26.219`

**Solution Options**:

### Option 1: Update Tunnel Config Manually
1. Go to Cloudflare Dashboard → Tunnels
2. Click on your tunnel → Configure
3. Edit the Public Hostname
4. Update Service URL to new IP
5. Save

### Option 2: Use Dynamic Update Script
Create a script that:
1. Gets new ECS IP
2. Updates Cloudflare Tunnel config via API
3. Runs periodically

### Option 3: Run Cloudflared in ECS (Best)
Run cloudflared as a sidecar container in your ECS task. This keeps the tunnel running even when tasks restart.

## Next Steps After Setup

1. ✅ Test HTTPS endpoint: `curl https://agentgateway.niyogen.com/health`
2. ✅ Update frontend configuration (see below)
3. ✅ Deploy and test

## Update Frontend Configuration

Once HTTPS is working, update your frontend:

**1. Update `client-next/vercel.json`**:
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://agentgateway.niyogen.com",
    "BACKEND_API_URL": "https://agentgateway.niyogen.com",
    "FEED_API_URL": "https://agentgateway.niyogen.com"
  }
}
```

**2. Update `client-next/app/utils/api.ts`**:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentgateway.niyogen.com';
```

**3. Update Vercel environment variables**:
```bash
cd client-next
echo "https://agentgateway.niyogen.com" | vercel env add BACKEND_API_URL production
echo "https://agentgateway.niyogen.com" | vercel env add FEED_API_URL production
```

## Benefits

✅ **FREE** - No AWS costs  
✅ **HTTPS** - Automatic SSL/TLS  
✅ **DDoS Protection** - Built-in  
✅ **Fast** - Cloudflare's global network  
✅ **Easy Setup** - 5 minutes via dashboard  
✅ **Stable DNS** - No IP changes visible to users  

## Support

- Cloudflare Dashboard: https://one.dash.cloudflare.com/
- Documentation: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Support: https://community.cloudflare.com/

