# Environment Variables Setup

## Do You Need .env File?

**Yes, for local development!** But it's optional for production (Vercel handles it).

## 📋 Setup Options

### Option 1: Local Development (.env.local) ✅ Recommended

Create `.env.local` in `client-next/` directory:

```bash
# API Gateway URL (HTTPS, stable)
NEXT_PUBLIC_API_URL=https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod

# Direct Backend URL (HTTP, fastest for chat stream)
# ⚠️  Update this after each ECS redeployment
NEXT_PUBLIC_BACKEND_DIRECT_URL=http://3.82.226.162:8081

# Optional: For proxy routes
BACKEND_API_URL=https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
FEED_API_URL=https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
```

**Note**: `.env.local` is gitignored (won't be committed)

### Option 2: Production (Vercel)

**Vercel Dashboard** (Recommended):
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   - `NEXT_PUBLIC_API_URL` = `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod`
   - `NEXT_PUBLIC_BACKEND_DIRECT_URL` = `http://3.82.226.162:8081`
   - `BACKEND_API_URL` = `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod`
   - `FEED_API_URL` = `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod`

**Or use vercel.json** (Already configured):
- Environment variables are in `vercel.json`
- But `NEXT_PUBLIC_BACKEND_DIRECT_URL` needs to be added to Vercel Dashboard

## 🔄 Updating Backend IP

When you redeploy ECS, the backend IP changes. Update it:

1. **Get new IP**:
   ```bash
   cd server
   ./update-backend-url.sh
   ```

2. **Update .env.local** (for local dev):
   ```bash
   # Update NEXT_PUBLIC_BACKEND_DIRECT_URL in .env.local
   ```

3. **Update Vercel** (for production):
   - Go to Vercel Dashboard → Environment Variables
   - Update `NEXT_PUBLIC_BACKEND_DIRECT_URL`

## 📝 Required Variables

### For Local Development

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | API Gateway URL | Feed, upload, health endpoints |
| `NEXT_PUBLIC_BACKEND_DIRECT_URL` | Backend IP:8081 | Chat stream (direct, fastest) |

### For Production (Vercel)

Same variables, but set in Vercel Dashboard.

## ✅ Current Configuration

- ✅ `.env.local` - Created with current values
- ✅ `.env.example` - Template for reference
- ✅ `vercel.json` - Has API Gateway URLs
- ⚠️  `NEXT_PUBLIC_BACKEND_DIRECT_URL` - Needs to be added to Vercel

## 🧪 Testing

### Local Development

```bash
cd client-next
npm run dev
```

The app will use `.env.local` values.

### Production

Vercel will use environment variables from:
1. Vercel Dashboard (highest priority)
2. `vercel.json` (fallback)

## 📋 Summary

- **Local Dev**: Use `.env.local` ✅ (already created)
- **Production**: Use Vercel Dashboard ✅ (add `NEXT_PUBLIC_BACKEND_DIRECT_URL`)
- **Both**: Have fallback values in code
