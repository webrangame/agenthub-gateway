# Vercel Environment Variables - Current Status

## ✅ All Required Variables Are Set!

Checked via Vercel CLI on: $(date)

### Environment Variables Found:

1. **NEXT_PUBLIC_BACKEND_DIRECT_URL** ✅
   - Created: 8 minutes ago
   - Environments: Development, Preview, Production
   - Status: ✅ Set

2. **NEXT_PUBLIC_API_URL** ✅
   - Created: 15 hours ago
   - Environments: Production, Preview, Development
   - Status: ✅ Set

3. **BACKEND_API_URL** ✅
   - Created: 15 hours ago
   - Environments: Production, Preview, Development
   - Status: ✅ Set

4. **FEED_API_URL** ✅
   - Created: 15 hours ago
   - Environments: Production, Preview, Development
   - Status: ✅ Set

5. **EXTERNAL_API_URL** ✅
   - Created: 13 hours ago
   - Environments: Production, Preview, Development
   - Status: ✅ Set (may be legacy)

## 📋 Expected Values

### NEXT_PUBLIC_API_URL
```
https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
```

### NEXT_PUBLIC_BACKEND_DIRECT_URL
```
http://3.82.226.162:8081
```
⚠️ **Update this after each ECS redeployment**

### BACKEND_API_URL
```
https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
```

### FEED_API_URL
```
https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod
```

## 🔍 How to Verify Values

Since values are encrypted in CLI, verify in Vercel Dashboard:

1. **Go to**: https://vercel.com/dashboard
2. **Select**: Your project
3. **Navigate**: Settings → Environment Variables
4. **Check**: Each variable's value

## 🔄 Update NEXT_PUBLIC_BACKEND_DIRECT_URL

When backend IP changes (after ECS redeployment):

1. **Get new IP**:
   ```bash
   cd server
   ./update-backend-url.sh
   ```

2. **Update in Vercel**:
   - Vercel Dashboard → Settings → Environment Variables
   - Edit `NEXT_PUBLIC_BACKEND_DIRECT_URL`
   - Change to new IP
   - Save and redeploy

   **Or use CLI**:
   ```bash
   cd client-next
   echo "http://NEW_IP:8081" | vercel env rm NEXT_PUBLIC_BACKEND_DIRECT_URL production
   echo "http://NEW_IP:8081" | vercel env add NEXT_PUBLIC_BACKEND_DIRECT_URL production
   ```

## ✅ Summary

- ✅ All 5 environment variables are set
- ✅ All configured for Production, Preview, and Development
- ⚠️  Verify `NEXT_PUBLIC_BACKEND_DIRECT_URL` has current IP: `3.82.226.162`

## 🧪 Test Configuration

After verifying values, test:

1. **Feed endpoint**: Should use API Gateway
2. **Chat endpoint**: Should use direct backend (`http://3.82.226.162:8081`)
3. **Upload endpoint**: Should use API Gateway

Check browser Network tab to verify correct URLs are being used.
