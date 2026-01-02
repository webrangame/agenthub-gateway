# Add VERCEL_TOKEN to GitHub Secrets

## Your Token
```
Khxb6NvqeO29ZjNEedvTKeVv
```

## Quick Steps to Add

1. **Go to GitHub Secrets:**
   - https://github.com/niyogen/agenthub-gateway/settings/secrets/actions

2. **Click "New repository secret"**

3. **Fill in:**
   - **Name:** `VERCEL_TOKEN`
   - **Secret:** `Khxb6NvqeO29ZjNEedvTKeVv`
   - Click **"Add secret"**

4. **Verify it's added:**
   - You should see `VERCEL_TOKEN` in the secrets list

## All Required Secrets Checklist

After adding the token, verify you have all these:

- [x] `VERCEL_TOKEN` = `Khxb6NvqeO29ZjNEedvTKeVv` (add this now)
- [x] `VERCEL_ORG_ID` = `team_3ABD9xuy4MGJKTHm4L3HD2Sh`
- [x] `VERCEL_PROJECT_ID` = `prj_yogugzXjOFH96JnPLFRD9C87o1gE`
- [ ] `BACKEND_API_URL` = `http://54.196.193.42:8081` (optional)

## After Adding

Once you've added the token:
1. Go to: https://github.com/niyogen/agenthub-gateway/actions
2. Find "Deploy Client-Next to Vercel (Simple)"
3. Click "Run workflow" to test
4. Or wait for next push to trigger automatically




