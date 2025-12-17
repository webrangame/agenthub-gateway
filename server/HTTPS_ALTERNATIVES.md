# HTTPS Setup - Multiple Methods

Since AWS ALB is not available, here are **5 different methods** to add HTTPS to your API:

## Method 1: Cloudflare DNS + Proxy (Easiest - 2 minutes) ⭐ RECOMMENDED

**Cost**: FREE  
**Setup Time**: 2 minutes  
**Difficulty**: Very Easy

### Steps:

1. **Add Domain to Cloudflare** (if not already):
   - Go to: https://dash.cloudflare.com/
   - Add site: `niyogen.com`
   - Update nameservers in your domain registrar

2. **Add DNS Record**:
   - Go to Cloudflare Dashboard → DNS → Records
   - Click "Add record"
   - **Type**: A
   - **Name**: `agentgateway`
   - **IPv4 address**: `107.23.26.219`
   - **Proxy status**: **Proxied** (orange cloud) ← This enables HTTPS!
   - Click "Save"

3. **Done!** Your API is now available at:
   - `https://agentgateway.niyogen.com`

### Pros:
- ✅ FREE
- ✅ Automatic HTTPS
- ✅ DDoS protection
- ✅ Very easy setup
- ✅ Works immediately

### Cons:
- ⚠️ Need to update IP if ECS task restarts
- ⚠️ Domain must be in Cloudflare

---

## Method 2: Cloudflare Tunnel (More Stable)

**Cost**: FREE  
**Setup Time**: 5-10 minutes  
**Difficulty**: Medium

### Steps:
1. Go to: https://one.dash.cloudflare.com/
2. Zero Trust → Networks → Tunnels
3. Create tunnel → Configure hostname
4. Service: `http://107.23.26.219:8081`

### Pros:
- ✅ FREE
- ✅ Automatic HTTPS
- ✅ Can handle IP changes (if configured properly)
- ✅ More stable than DNS proxy

### Cons:
- ⚠️ Requires Cloudflare account setup
- ⚠️ Slightly more complex

---

## Method 3: Nginx Reverse Proxy with Let's Encrypt (Self-Hosted)

**Cost**: FREE (if you have a VPS/server)  
**Setup Time**: 15-20 minutes  
**Difficulty**: Medium

### Steps:

1. **Install Nginx on a VPS/EC2 instance**:
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

2. **Configure Nginx**:
```nginx
# /etc/nginx/sites-available/agentgateway
server {
    listen 80;
    server_name agentgateway.niyogen.com;

    location / {
        proxy_pass http://107.23.26.219:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **Enable site**:
```bash
sudo ln -s /etc/nginx/sites-available/agentgateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Get SSL Certificate**:
```bash
sudo certbot --nginx -d agentgateway.niyogen.com
```

### Pros:
- ✅ FREE SSL (Let's Encrypt)
- ✅ Full control
- ✅ Can add custom configurations

### Cons:
- ⚠️ Requires a VPS/server
- ⚠️ Need to maintain server
- ⚠️ More complex setup

---

## Method 4: Caddy Server (Automatic HTTPS)

**Cost**: FREE  
**Setup Time**: 10 minutes  
**Difficulty**: Easy

### Steps:

1. **Install Caddy**:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

2. **Create Caddyfile**:
```bash
# /etc/caddy/Caddyfile
agentgateway.niyogen.com {
    reverse_proxy http://107.23.26.219:8081
}
```

3. **Start Caddy**:
```bash
sudo systemctl start caddy
sudo systemctl enable caddy
```

### Pros:
- ✅ Automatic HTTPS (no manual cert setup)
- ✅ FREE
- ✅ Very easy
- ✅ Auto-renewal

### Cons:
- ⚠️ Requires a VPS/server
- ⚠️ Need to maintain server

---

## Method 5: Next.js API Proxy (Already Available!)

**Cost**: FREE (uses existing Next.js app)  
**Setup Time**: Already done!  
**Difficulty**: None

### Current Setup:

You already have Next.js proxy routes:
- `/api/proxy/feed` → Proxies to backend
- `/api/proxy/chat` → Proxies to backend
- `/api/proxy/upload` → Proxies to backend

### To Enable HTTPS:

1. **Deploy Next.js to Vercel** (already done):
   - Vercel automatically provides HTTPS
   - Your frontend is already at HTTPS URL

2. **Update API calls to use relative paths**:
   - Already configured! Your proxy routes work with HTTPS

### Pros:
- ✅ Already set up
- ✅ FREE (Vercel free tier)
- ✅ Automatic HTTPS via Vercel
- ✅ No additional setup needed

### Cons:
- ⚠️ All traffic goes through Next.js server
- ⚠️ Slight latency for API calls

---

## Method 6: AWS API Gateway (If Available)

**Cost**: Pay per request (~$3.50 per million requests)  
**Setup Time**: 20-30 minutes  
**Difficulty**: Medium-Hard

### Steps:

1. Create API Gateway REST API
2. Create HTTP integration to `http://107.23.26.219:8081`
3. Configure custom domain with ACM certificate
4. Deploy API

### Pros:
- ✅ Native AWS integration
- ✅ Automatic scaling
- ✅ Built-in HTTPS

### Cons:
- ⚠️ Costs money (pay per request)
- ⚠️ More complex setup
- ⚠️ May have account restrictions

---

## Comparison Table

| Method | Cost | Setup Time | Difficulty | Stability | Best For |
|--------|------|------------|------------|-----------|----------|
| **Cloudflare DNS Proxy** | FREE | 2 min | ⭐ Very Easy | Good | Quick setup |
| **Cloudflare Tunnel** | FREE | 5-10 min | ⭐⭐ Easy | Excellent | Production |
| **Nginx + Let's Encrypt** | FREE* | 15-20 min | ⭐⭐⭐ Medium | Excellent | Full control |
| **Caddy Server** | FREE* | 10 min | ⭐⭐ Easy | Excellent | Auto HTTPS |
| **Next.js Proxy** | FREE | 0 min | ⭐ Done! | Good | Current setup |
| **API Gateway** | $3.50/M | 20-30 min | ⭐⭐⭐⭐ Hard | Excellent | Enterprise |

*Requires VPS/server

---

## Recommendation

### For Quick Setup (Today):
**Method 1: Cloudflare DNS + Proxy** ⭐
- 2 minutes setup
- FREE
- Automatic HTTPS
- Works immediately

### For Production (Long-term):
**Method 2: Cloudflare Tunnel**
- More stable
- Handles IP changes better
- FREE
- Better for production

### Already Working:
**Method 5: Next.js Proxy**
- Your current setup already works!
- Frontend uses HTTPS via Vercel
- API calls go through Next.js proxy
- No changes needed if this works for you

---

## Quick Start: Cloudflare DNS Proxy (Recommended)

1. Go to: https://dash.cloudflare.com/
2. Select domain: `niyogen.com`
3. DNS → Add record:
   - Type: **A**
   - Name: `agentgateway`
   - IP: `107.23.26.219`
   - **Proxy: ON** (orange cloud) ← This enables HTTPS!
4. Save
5. Wait 1-2 minutes
6. Test: `curl https://agentgateway.niyogen.com/health`

**Done!** Your API now has HTTPS.

---

## Which Method Should You Use?

- **Need it NOW?** → Method 1 (Cloudflare DNS Proxy)
- **Want stability?** → Method 2 (Cloudflare Tunnel)
- **Have a VPS?** → Method 3 or 4 (Nginx/Caddy)
- **Current setup works?** → Method 5 (Keep using Next.js proxy)

