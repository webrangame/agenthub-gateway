# VERCEL_TOKEN Setup - Quick Guide

## Your Token
```
Khxb6NvqeO29ZjNEedvTKeVv
```

## Add to GitHub (2 minutes)

1. **Go to:** https://github.com/niyogen/agenthub-gateway/settings/secrets/actions

2. **Click:** "New repository secret"

3. **Enter:**
   - **Name:** `VERCEL_TOKEN`
   - **Secret:** `Khxb6NvqeO29ZjNEedvTKeVv`

4. **Click:** "Add secret"

## Verify All Secrets

Make sure you have these in GitHub Secrets:

- ✅ `VERCEL_TOKEN` = `Khxb6NvqeO29ZjNEedvTKeVv` ← **Add this now**
- ✅ `VERCEL_ORG_ID` = `team_3ABD9xuy4MGJKTHm4L3HD2Sh`
- ✅ `VERCEL_PROJECT_ID` = `prj_yogugzXjOFH96JnPLFRD9C87o1gE`
- ⬜ `BACKEND_API_URL` = `http://54.196.193.42:8081` (optional)

## Test After Adding

**Option 1: Manual Test (Recommended)**
1. Go to: https://github.com/niyogen/agenthub-gateway/actions
2. Click "Deploy Client-Next to Vercel (Simple)"
3. Click "Run workflow"
4. Select branch: `master`
5. Click "Run workflow"

**Option 2: Automatic Test**
- After adding token, push any change to `client-next/`
- Workflow will trigger automatically

## Expected Result

✅ Workflow runs successfully
✅ Deployment appears in Vercel dashboard
✅ Site updates with latest code

## Troubleshooting

If workflow fails:
- Check token is correct (no extra spaces)
- Verify all secrets are added
- Check GitHub Actions logs for specific error




