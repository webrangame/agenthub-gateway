# Free HTTPS Setup with Cloudflare

## Option 1: Cloudflare Tunnel (Free & Recommended)

### Step 1: Create Cloudflare Account
1. Go to https://cloudflare.com and sign up (free)
2. Add your domain or use a subdomain

### Step 2: Install Cloudflare Tunnel
```bash
# On your local machine or a server
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

### Step 3: Authenticate
```bash
cloudflared tunnel login
```

### Step 4: Create Tunnel
```bash
cloudflared tunnel create fastgraph-api
```

### Step 5: Configure Tunnel
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/user/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://54.226.4.196:8081
  - service: http_status:404
```

### Step 6: Run Tunnel
```bash
cloudflared tunnel run fastgraph-api
```

### Step 7: Route DNS
In Cloudflare dashboard:
- Add CNAME: `api.yourdomain.com` → `<TUNNEL_ID>.cfargotunnel.com`

**Result**: `https://api.yourdomain.com` → Your HTTP API (free HTTPS!)

---

## Option 2: Cloudflare DNS + Proxy (If you have a domain)

1. Add your domain to Cloudflare
2. Add A record: `api` → `54.226.4.196`
3. Enable "Proxy" (orange cloud) - this gives you free HTTPS
4. Update frontend to use: `https://api.yourdomain.com`

---

## Option 3: Use Next.js API Routes (Free, No Domain Needed)

Create a proxy in your Next.js app to avoid mixed content issues.

