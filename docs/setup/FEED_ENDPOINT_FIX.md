# Feed Endpoint Fix

## Issue

Feed endpoint is using old backend IP: `http://107.23.26.219:8081/api/feed`

**Should be using**: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/feed`

## Root Cause

The frontend might be:
1. Using cached code (not rebuilt)
2. Missing environment variable
3. Using old deployment

## Solution

### 1. Verify Configuration

The code is correct in `app/utils/api.ts`:
```typescript
feed: `${API_GATEWAY_URL}/api/feed`,  // Should use API Gateway
```

### 2. Check Environment Variables

Ensure `NEXT_PUBLIC_API_URL` is set:
- **Local**: In `.env.local`
- **Vercel**: In Vercel Dashboard

### 3. Rebuild/Redeploy

**Local Development**:
```bash
cd client-next
rm -rf .next
npm run dev
```

**Production (Vercel)**:
- Push to GitHub (triggers auto-deploy)
- Or manually redeploy in Vercel Dashboard

### 4. Clear Browser Cache

If testing in browser:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache

## Current Status

- ✅ **Code**: Correctly configured to use API Gateway
- ✅ **API Gateway**: Working (`https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/feed`)
- ⚠️  **Frontend**: May need rebuild/redeploy

## Quick Fix

1. **Rebuild locally**:
   ```bash
   cd client-next
   rm -rf .next node_modules/.cache
   npm run build
   npm run dev
   ```

2. **Or redeploy to Vercel**:
   - Push latest code to GitHub
   - Vercel will auto-deploy
   - Or manually trigger deployment

## Verification

After fix, check browser Network tab:
- **Should see**: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/feed`
- **Not**: `http://107.23.26.219:8081/api/feed`

