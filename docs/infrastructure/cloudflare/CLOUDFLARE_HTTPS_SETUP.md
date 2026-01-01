# Cloudflare Tunnel Setup - FREE HTTPS Alternative

Since your AWS account doesn't support creating load balancers, **Cloudflare Tunnel** is the perfect FREE alternative that provides:
- ✅ HTTPS/SSL encryption
- ✅ Stable DNS endpoint
- ✅ DDoS protection
- ✅ No AWS costs
- ✅ Easy setup

## Why Cloudflare Tunnel?

| Feature | AWS ALB | Cloudflare Tunnel |
|---------|---------|-------------------|
| Cost | ~$16-30/month | **FREE** |
| HTTPS | ✅ | ✅ |
| Stable DNS | ✅ | ✅ |
| Setup | Medium | Easy |
| DDoS Protection | Basic | Advanced |

## Quick Setup (5 minutes)

### Step 1: Get Current ECS IP

```bash
cd server
./setup-cloudflare-tunnel.sh
```

This will show you the current ECS public IP.

### Step 2: Set Up Cloudflare Tunnel

**Option A: Via Cloudflare Dashboard (Easiest)**

1. **Sign up/Login**: https://one.dash.cloudflare.com/
   - If you don't have an account, sign up (free)
   - Add your domain `agentgateway.niyogen.com` to Cloudflare

2. **Create Tunnel**:
   - Go to: **Zero Trust** → **Networks** → **Tunnels**
   - Click **"Create a tunnel"**
   - Choose **"Cloudflared"**
   - Name: `fastgraph-gateway-tunnel`
   - Copy the token (you'll need it)

3. **Configure Public Hostname**:
   - Click on your tunnel → **Configure**
   - Add **Public Hostname**:
     - **Subdomain**: `agentgateway` (or leave empty if using root domain)
     - **Domain**: `niyogen.com`
     - **Service**: `http://YOUR_ECS_IP:8081`
     - **Path**: (leave empty)
   - Click **Save**

4. **Deploy**: The tunnel will automatically connect

**Option B: Via Command Line**

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Login to Cloudflare
./cloudflared tunnel login

# Create tunnel
./cloudflared tunnel create fastgraph-gateway-tunnel

# Configure DNS
./cloudflared tunnel route dns fastgraph-gateway-tunnel agentgateway.niyogen.com

# Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: fastgraph-gateway-tunnel
credentials-file: ~/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: agentgateway.niyogen.com
    service: http://YOUR_ECS_IP:8081
  - service: http_status:404
EOF

# Run tunnel
./cloudflared tunnel run fastgraph-gateway-tunnel
```

### Step 3: Test HTTPS

Wait 1-2 minutes for DNS propagation, then:

```bash
# Test health endpoint
curl https://agentgateway.niyogen.com/health

# Test API feed
curl https://agentgateway.niyogen.com/api/feed
```

### Step 4: Update Frontend

Update all API URLs to use HTTPS:

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

## Handling IP Changes

**Problem**: ECS task IP changes when tasks restart.

**Solution Options**:

### Option 1: Update Tunnel Config (Manual)
When IP changes, update the tunnel configuration in Cloudflare Dashboard:
- Go to Tunnel → Configure → Edit Public Hostname
- Update Service URL to new IP

### Option 2: Run Cloudflared in ECS (Automatic)
Run cloudflared as a sidecar container in your ECS task. This keeps the tunnel running even when tasks restart.

**Create sidecar task definition**:
```json
{
  "containerDefinitions": [
    {
      "name": "fastgraph-gateway",
      "image": "...",
      "portMappings": [{"containerPort": 8081}]
    },
    {
      "name": "cloudflared",
      "image": "cloudflare/cloudflared:latest",
      "command": ["tunnel", "run"],
      "environment": [
        {"name": "TUNNEL_TOKEN", "value": "YOUR_TUNNEL_TOKEN"}
      ]
    }
  ]
}
```

### Option 3: Dynamic DNS Update Script
Create a script that:
1. Gets new ECS IP
2. Updates Cloudflare Tunnel config via API
3. Runs periodically or on task start

## Advantages of Cloudflare Tunnel

✅ **FREE** - No AWS costs  
✅ **HTTPS** - Automatic SSL/TLS  
✅ **DDoS Protection** - Built-in  
✅ **Fast** - Cloudflare's global network  
✅ **Easy Setup** - 5 minutes  
✅ **Stable DNS** - No IP changes visible to users  

## Troubleshooting

### Tunnel Not Connecting
- Check tunnel token is correct
- Verify cloudflared is running
- Check Cloudflare Dashboard for errors

### DNS Not Resolving
- Wait 5-10 minutes for DNS propagation
- Check DNS records in Cloudflare Dashboard
- Verify domain is added to Cloudflare

### 502 Bad Gateway
- Check ECS task is running
- Verify IP address is correct
- Check security group allows Cloudflare IPs (optional)

### IP Changed
- Update tunnel configuration with new IP
- Or use sidecar container approach
- Or set up dynamic update script

## Next Steps

1. ✅ Set up Cloudflare account (if needed)
2. ✅ Create tunnel via Dashboard
3. ✅ Configure public hostname
4. ✅ Test HTTPS endpoint
5. ✅ Update frontend configuration
6. ✅ (Optional) Set up sidecar container for automatic IP updates

## Resources

- Cloudflare Dashboard: https://one.dash.cloudflare.com/
- Documentation: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Tunnel Setup Guide: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/

