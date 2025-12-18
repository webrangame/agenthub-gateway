# Environment Variables Consolidation

## ✅ Simplified to Single Variable

We've consolidated all environment variables to use **`BACKEND_API_URL`** as the single source of truth.

## 📋 Required Environment Variables

### For Vercel (Production)

**Only ONE variable needed:**

```bash
BACKEND_API_URL=http://3.80.195.233:8081
```

### Optional (Auto-fallback)

- `NEXT_PUBLIC_API_URL` - Falls back to `BACKEND_API_URL` if not set
  - Only needed if you want different values for client-side vs server-side

## 🔄 Migration Guide

### Old Configuration (Multiple Variables)
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "http://3.80.195.233:8081",
    "BACKEND_API_URL": "http://3.80.195.233:8081",
    "FEED_API_URL": "http://3.80.195.233:8081",
    "NEXT_PUBLIC_BACKEND_DIRECT_URL": "http://3.80.195.233:8081",
    "EXTERNAL_API_URL": "http://3.80.195.233:8081"
  }
}
```

### New Configuration (Single Variable)
```json
{
  "env": {
    "BACKEND_API_URL": "http://3.80.195.233:8081"
  }
}
```

## 📝 How It Works

1. **Server-side (Proxy Routes)**: 
   - `app/api/proxy/feed/route.ts` → Uses `BACKEND_API_URL`
   - `app/api/proxy/chat/route.ts` → Uses `BACKEND_API_URL`
   - `app/api/proxy/upload/route.ts` → Uses `BACKEND_API_URL`

2. **Client-side**:
   - `app/utils/api.ts` → Uses `NEXT_PUBLIC_API_URL` (falls back to `BACKEND_API_URL`)
   - Since we use proxy routes, client-side doesn't directly access the backend

## 🎯 Vercel Setup

### Step 1: Remove Old Variables

In Vercel Dashboard → Settings → Environment Variables, you can **remove**:
- ❌ `FEED_API_URL` (no longer needed)
- ❌ `NEXT_PUBLIC_BACKEND_DIRECT_URL` (no longer used)
- ❌ `EXTERNAL_API_URL` (no longer used)

### Step 2: Keep/Add Single Variable

**Keep or Add:**
- ✅ `BACKEND_API_URL` = `http://3.80.195.233:8081`

**Optional:**
- `NEXT_PUBLIC_API_URL` = `http://3.80.195.233:8081` (only if you want explicit client-side value)

## 🔄 Updating After ECS Redeployment

When backend IP changes:

1. **Update single variable in Vercel**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Update `BACKEND_API_URL` to new IP
   - Redeploy

2. **Update local `.env.local`**:
   ```bash
   BACKEND_API_URL=http://NEW_IP:8081
   ```

## ✅ Benefits

- **Simpler**: One variable instead of five
- **Less confusion**: Single source of truth
- **Easier updates**: Change one value, not multiple
- **Consistent**: All endpoints use same URL

## 📊 Variable Usage Map

| Component | Variable Used | Fallback |
|-----------|---------------|----------|
| Feed Proxy | `BACKEND_API_URL` | `http://3.80.195.233:8081` |
| Chat Proxy | `BACKEND_API_URL` | `http://3.80.195.233:8081` |
| Upload Proxy | `BACKEND_API_URL` | `http://3.80.195.233:8081` |
| Client API Utils | `NEXT_PUBLIC_API_URL` → `BACKEND_API_URL` | `http://3.80.195.233:8081` |

## 🧪 Testing

After updating, verify:

1. **Feed endpoint works**: `/api/proxy/feed`
2. **Chat stream works**: `/api/proxy/chat`
3. **Upload works**: `/api/proxy/upload`
4. **Health check works**: Direct backend `/health`

All should use the same `BACKEND_API_URL` value.
