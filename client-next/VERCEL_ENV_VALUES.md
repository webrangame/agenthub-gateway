# Vercel Environment Variables - Current Values

## 📋 Required Environment Variables

### ✅ Set in vercel.json (Auto-configured)

These are automatically set when deploying:

1. **NEXT_PUBLIC_API_URL**
   ```
   https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
   ```

2. **BACKEND_API_URL**
   ```
   https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
   ```

3. **FEED_API_URL**
   ```
   https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
   ```

### ⚠️ Must be Added in Vercel Dashboard

1. **NEXT_PUBLIC_BACKEND_DIRECT_URL** ⚠️ **MISSING**
   ```
   http://3.82.226.162:8081
   ```
   
   **Why not in vercel.json?**
   - This IP changes after each ECS redeployment
   - Should be managed manually in Vercel Dashboard
   - Needs to be updated when backend IP changes

## 🔧 How to Add in Vercel Dashboard

### Step-by-Step:

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Select your project

2. **Navigate to Environment Variables**
   - Click **Settings** (top menu)
   - Click **Environment Variables** (left sidebar)

3. **Add New Variable**
   - Click **"Add New"** button
   - Fill in:
     - **Key**: `NEXT_PUBLIC_BACKEND_DIRECT_URL`
     - **Value**: `http://3.82.226.162:8081`
     - **Environment**: 
       - ✅ Production
       - ✅ Preview
       - ✅ Development
     - Click **"Save"**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on latest deployment
   - Or wait for next auto-deployment

## 📊 Variable Usage

| Variable | Used For | Current Value |
|----------|----------|---------------|
| `NEXT_PUBLIC_API_URL` | Feed, Upload, Health | API Gateway URL |
| `NEXT_PUBLIC_BACKEND_DIRECT_URL` | Chat Stream | `http://3.82.226.162:8081` |
| `BACKEND_API_URL` | Proxy routes | API Gateway URL |
| `FEED_API_URL` | Feed proxy | API Gateway URL |

## 🔄 Updating After ECS Redeployment

When backend IP changes:

1. **Get new IP**:
   ```bash
   cd server
   ./update-backend-url.sh
   ```

2. **Update in Vercel**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Edit `NEXT_PUBLIC_BACKEND_DIRECT_URL`
   - Change value to new IP
   - Save and redeploy

## ✅ Verification

After setting variables, verify:

1. **Check build logs**:
   - Vercel Dashboard → Deployments → Latest → Build Logs
   - Should show environment variables being used

2. **Test endpoints**:
   - Feed: Should use API Gateway
   - Chat: Should use direct backend (`http://3.82.226.162:8081`)
   - Upload: Should use API Gateway

3. **Browser Network tab**:
   - Check actual requests being made
   - Verify correct URLs

## 🧪 Quick Test

After deployment, check browser console:
```javascript
// Should show API Gateway URL
console.log(process.env.NEXT_PUBLIC_API_URL);

// Should show backend IP
console.log(process.env.NEXT_PUBLIC_BACKEND_DIRECT_URL);
```

## 📝 Summary

- ✅ 3 variables set in `vercel.json`
- ⚠️ 1 variable (`NEXT_PUBLIC_BACKEND_DIRECT_URL`) needs to be added in Vercel Dashboard
- 🔄 Update `NEXT_PUBLIC_BACKEND_DIRECT_URL` after each ECS redeployment
