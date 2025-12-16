# Testing CI/CD Pipeline

## ✅ Pre-Flight Checklist

Before testing, make sure:

- [x] ✅ Workflow files created (`.github/workflows/deploy-client-next-simple.yml`)
- [x] ✅ GitHub Secrets added:
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID` = `team_3ABD9xuy4MGJKTHm4L3HD2Sh`
  - [ ] `VERCEL_PROJECT_ID` = `prj_yogugzXjOFH96JnPLFRD9C87o1gE`
  - [ ] `BACKEND_API_URL` = `http://54.196.193.42:8081` (optional)

## 🚀 Test Steps

### Step 1: Commit Workflow Files

```bash
cd /home/ranga/code/pragith/new-fastgrafe/agenthub-gateway

# Add workflow files
git add .github/workflows/
git add .github/VERCEL_CI_CD_SETUP.md
git add .github/workflows/README.md

# Add test file to trigger deployment
git add client-next/test-ci.txt

# Commit
git commit -m "Add Vercel CI/CD pipeline and test trigger"

# Push to trigger workflow
git push origin master
```

### Step 2: Check GitHub Actions

1. Go to: https://github.com/webrangame/agenthub-gateway/actions
2. Look for "Deploy Client-Next to Vercel (Simple)"
3. Click on it to see the workflow run

### Step 3: Monitor Deployment

**In GitHub Actions:**
- ✅ Green checkmark = Success
- ❌ Red X = Failed (check logs)

**In Vercel Dashboard:**
- Go to: https://vercel.com/dashboard
- Check your `client-next` project
- Look for new deployment

## 🔍 What to Look For

### Successful Deployment:
- ✅ Workflow shows "Deploy to Vercel" job completed
- ✅ No errors in logs
- ✅ New deployment appears in Vercel dashboard
- ✅ Deployment URL is accessible

### Common Issues:

**1. "VERCEL_TOKEN not found"**
- Solution: Add `VERCEL_TOKEN` to GitHub Secrets

**2. "Project not found"**
- Solution: Verify `VERCEL_PROJECT_ID` is correct

**3. "Build failed"**
- Solution: Check build logs in GitHub Actions

**4. "Deployment succeeded but site not updated"**
- Solution: Check Vercel dashboard - might be queued

## 🧪 Manual Test (Alternative)

If automatic trigger doesn't work:

1. Go to: https://github.com/webrangame/agenthub-gateway/actions
2. Click "Deploy Client-Next to Vercel (Simple)"
3. Click "Run workflow"
4. Select branch: `master`
5. Click "Run workflow"

## 📊 Expected Workflow Steps

1. ✅ Checkout code
2. ✅ Setup Node.js
3. ✅ Install dependencies (`npm ci`)
4. ✅ Install Vercel CLI
5. ✅ Deploy to Vercel (`vercel --prod`)
6. ✅ Deployment Status

## 🎯 Success Criteria

- [ ] Workflow runs without errors
- [ ] Deployment appears in Vercel
- [ ] Site is accessible at Vercel URL
- [ ] No manual intervention needed

## 🐛 Troubleshooting

### Workflow Not Triggering?

1. Check branch name (should be `master` or `main`)
2. Check file paths (should be in `client-next/**`)
3. Verify workflow file is committed

### Deployment Fails?

1. Check GitHub Actions logs
2. Verify all secrets are correct
3. Check Vercel project exists
4. Verify token has correct permissions

### Need Help?

- Check workflow logs in GitHub Actions
- Check Vercel deployment logs
- Verify secrets in GitHub Settings

## ✅ Next Steps After Success

Once deployment works:

1. Remove test file: `rm client-next/test-ci.txt`
2. Commit removal: `git commit -m "Remove test file"`
3. Push: `git push origin master`
4. Future deployments will happen automatically on every push to `client-next/**`




