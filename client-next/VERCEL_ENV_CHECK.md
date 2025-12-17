# Vercel Environment Variables Checklist

## ✅ Required Environment Variables

### 1. NEXT_PUBLIC_API_URL (Required)
**Purpose**: API Gateway URL for feed, upload, and health endpoints

**Value**:
```
https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
```

**Status**: ✅ Set in `vercel.json`

---

### 2. NEXT_PUBLIC_BACKEND_DIRECT_URL (Required)
**Purpose**: Direct backend URL for chat stream (fastest, no timeout)

**Value**:
```
http://3.82.226.162:8081
```

**Status**: ⚠️ **NEEDS TO BE ADDED TO VERCEL DASHBOARD**

**Note**: This IP changes when ECS is redeployed. Update after each deployment.

---

### 3. BACKEND_API_URL (Optional - for proxy routes)
**Purpose**: Backend API URL for proxy routes

**Value**:
```
https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
```

**Status**: ✅ Set in `vercel.json`

---

### 4. FEED_API_URL (Optional - for proxy routes)
**Purpose**: Feed API URL for proxy routes

**Value**:
```
https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
```

**Status**: ✅ Set in `vercel.json`

---

## 📋 How to Check in Vercel Dashboard

1. **Go to**: https://vercel.com/dashboard
2. **Select your project**
3. **Navigate to**: Settings → Environment Variables
4. **Check for**:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_BACKEND_DIRECT_URL` ⚠️ (may be missing)
   - `BACKEND_API_URL`
   - `FEED_API_URL`

## 🔧 How to Add Missing Variables

### Add NEXT_PUBLIC_BACKEND_DIRECT_URL

1. In Vercel Dashboard → Settings → Environment Variables
2. Click **"Add New"**
3. Fill in:
   - **Key**: `NEXT_PUBLIC_BACKEND_DIRECT_URL`
   - **Value**: `http://3.82.226.162:8081`
   - **Environment**: Select all (Production, Preview, Development)
4. Click **"Save"**
5. **Redeploy** the application

## 📊 Current Configuration Summary

| Variable | Status | Value |
|----------|--------|-------|
| `NEXT_PUBLIC_API_URL` | ✅ In vercel.json | API Gateway URL |
| `NEXT_PUBLIC_BACKEND_DIRECT_URL` | ⚠️ **MISSING** | `http://3.82.226.162:8081` |
| `BACKEND_API_URL` | ✅ In vercel.json | API Gateway URL |
| `FEED_API_URL` | ✅ In vercel.json | API Gateway URL |

## ⚠️ Important Notes

1. **NEXT_PUBLIC_BACKEND_DIRECT_URL** is **NOT** in `vercel.json` because:
   - It changes frequently (after each ECS redeployment)
   - Should be managed in Vercel Dashboard
   - Needs manual updates

2. **After ECS Redeployment**:
   - Get new IP: `cd server && ./update-backend-url.sh`
   - Update Vercel: Change `NEXT_PUBLIC_BACKEND_DIRECT_URL` value
   - Redeploy

3. **Priority Order**:
   - Vercel Dashboard variables (highest priority)
   - `vercel.json` (fallback)
   - Code defaults (last resort)

## 🧪 Verify Configuration

After setting variables, verify:

1. **Check build logs** in Vercel:
   - Should show environment variables being used
   - No errors about missing variables

2. **Test endpoints**:
   - Feed: Should use API Gateway
   - Chat: Should use direct backend
   - Upload: Should use API Gateway

3. **Check browser Network tab**:
   - Feed: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/feed`
   - Chat: `http://3.82.226.162:8081/api/chat/stream`

## 🔄 Quick Update Script

To update `NEXT_PUBLIC_BACKEND_DIRECT_URL` after ECS redeployment:

```bash
cd server
./update-backend-url.sh
# Follow instructions to update Vercel
```

