# Vercel CI/CD Setup Guide

This guide explains how to set up reliable CI/CD for deploying `client-next` to Vercel using GitHub Actions.

## Problem with Vercel Free Account Auto-Deploy

Vercel's automatic GitHub integration can be unreliable on free accounts:
- Sometimes deployments don't trigger
- Builds can fail silently
- No control over deployment process

**Solution:** Use GitHub Actions to deploy to Vercel (more reliable and gives you full control).

## Setup Steps

### Step 1: Get Vercel Credentials

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to **Settings** → **Tokens**
3. Create a new token (name it "GitHub Actions")
4. Copy the token (you'll need it for GitHub secrets)

5. Get your Project ID:
   - Go to your project settings
   - Copy the **Project ID**

6. Get your Organization ID:
   - Go to **Settings** → **General**
   - Copy the **Organization ID**

### Step 2: Add GitHub Secrets

Go to your GitHub repository:
1. **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `VERCEL_TOKEN` | Your Vercel token | Settings → Tokens |
| `VERCEL_ORG_ID` | Your organization ID | Settings → General |
| `VERCEL_PROJECT_ID` | Your project ID | Project Settings |
| `BACKEND_API_URL` | `http://54.196.193.42:8081` | Your API endpoint |
| `NEXT_PUBLIC_API_URL` | `http://54.196.193.42:8081` | Your API endpoint (optional) |

### Step 3: Choose Workflow

We provide two workflow options:

#### Option A: Full CI/CD Pipeline (Recommended)

**File:** `.github/workflows/deploy-client-next.yml`

**Features:**
- ✅ Linting before deployment
- ✅ Build verification
- ✅ Preview deployments for PRs
- ✅ Production deployments for main/master
- ✅ PR comments with preview URLs

**Use this if:** You want comprehensive checks and preview deployments.

#### Option B: Simple Deployment (Faster)

**File:** `.github/workflows/deploy-client-next-simple.yml`

**Features:**
- ✅ Fast deployment
- ✅ Minimal checks
- ✅ Production only

**Use this if:** You want the fastest, simplest deployment.

### Step 4: Enable the Workflow

1. **Disable Vercel's auto-deploy** (to avoid conflicts):
   - Go to Vercel Dashboard → Your Project → Settings → Git
   - Disconnect the GitHub integration OR
   - Keep it but GitHub Actions will take precedence

2. **Push to trigger workflow:**
   ```bash
   git add .github/workflows/deploy-client-next.yml
   git commit -m "Add Vercel CI/CD pipeline"
   git push origin master
   ```

3. **Check workflow status:**
   - Go to GitHub → **Actions** tab
   - You should see "Deploy Client-Next to Vercel" running

## Workflow Behavior

### On Push to master/main:
- Runs linting
- Builds the app
- Deploys to Vercel **production**

### On Pull Request:
- Runs linting
- Builds the app
- Creates a **preview deployment**
- Comments on PR with preview URL

### Manual Trigger:
- Go to **Actions** → **Deploy Client-Next to Vercel** → **Run workflow**

## Troubleshooting

### Workflow Fails: "VERCEL_TOKEN not found"

**Solution:** Add `VERCEL_TOKEN` to GitHub Secrets (Step 2)

### Workflow Fails: "Project not found"

**Solution:** 
1. Verify `VERCEL_PROJECT_ID` is correct
2. Verify `VERCEL_ORG_ID` is correct
3. Make sure the token has access to the project

### Build Fails: "Environment variable missing"

**Solution:** Add missing environment variables to:
1. GitHub Secrets (for build)
2. Vercel Dashboard → Project Settings → Environment Variables (for runtime)

### Deployment Succeeds but Site Doesn't Update

**Solution:**
1. Check Vercel dashboard - deployment might be queued
2. Verify the workflow actually ran (check GitHub Actions)
3. Clear browser cache

### Vercel Auto-Deploy Still Running

**Solution:**
1. Disable Vercel's GitHub integration:
   - Vercel Dashboard → Project → Settings → Git
   - Click "Disconnect" or "Remove Integration"
2. Or keep both - GitHub Actions will deploy first, Vercel will skip if already deployed

## Workflow Files Explained

### `deploy-client-next.yml` (Full Pipeline)

```yaml
jobs:
  lint:        # Runs ESLint
  build:       # Builds Next.js app
  deploy:      # Deploys to production (master/main only)
  deploy-preview: # Creates preview for PRs
```

### `deploy-client-next-simple.yml` (Simple)

```yaml
jobs:
  deploy:      # Installs deps, builds, and deploys
```

## Environment Variables

### Required in GitHub Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Optional (for build):
- `BACKEND_API_URL` - Backend API URL
- `NEXT_PUBLIC_API_URL` - Public API URL

**Note:** These should also be set in Vercel Dashboard for runtime.

## Cost

- **GitHub Actions:** Free for public repos, 2000 minutes/month for private
- **Vercel:** Free tier includes:
  - 100GB bandwidth/month
  - Unlimited deployments
  - Preview deployments

## Best Practices

1. **Use the full pipeline** for production
2. **Test locally** before pushing
3. **Monitor deployments** in GitHub Actions
4. **Keep Vercel dashboard open** to see deployment status
5. **Set up notifications** for failed deployments

## Manual Deployment (Fallback)

If GitHub Actions fails, you can deploy manually:

```bash
cd client-next
npm install -g vercel
vercel --prod --token YOUR_TOKEN
```

## Next Steps

1. ✅ Add GitHub Secrets
2. ✅ Choose workflow (full or simple)
3. ✅ Push code to trigger
4. ✅ Monitor first deployment
5. ✅ Set up notifications (optional)

## Support

If deployments still fail:
1. Check GitHub Actions logs
2. Check Vercel deployment logs
3. Verify all secrets are correct
4. Ensure Vercel project exists and is accessible




