# How to Get VERCEL_TOKEN

## Quick Steps

1. **Go to Vercel Tokens Page:**
   - Direct link: https://vercel.com/account/tokens
   - Or: Vercel Dashboard → Settings → Tokens

2. **Create a New Token:**
   - Click **"Create Token"** button
   - Name it: `GitHub Actions` (or any name you prefer)
   - Select expiration (or leave as "No expiration" for CI/CD)
   - Click **"Create"**

3. **Copy the Token:**
   - ⚠️ **IMPORTANT:** Copy the token immediately
   - You can only see it once!
   - It will look like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

4. **Add to GitHub Secrets:**
   - Go to: https://github.com/niyogen/agenthub-gateway/settings/secrets/actions
   - Click **"New repository secret"**
   - Name: `VERCEL_TOKEN`
   - Value: Paste your token
   - Click **"Add secret"**

## Detailed Steps with Screenshots Guide

### Step 1: Access Vercel Account Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your profile icon (top right)
3. Click **"Settings"**
4. Click **"Tokens"** in the left sidebar

**Direct link:** https://vercel.com/account/tokens

### Step 2: Create Token

1. Click the **"Create Token"** button
2. Fill in the form:
   - **Name:** `GitHub Actions` (or `CI/CD Token`)
   - **Expiration:** 
     - For CI/CD: Select "No expiration" (recommended)
     - Or set a custom expiration date
3. Click **"Create"**

### Step 3: Copy Token

1. A modal will appear with your token
2. **⚠️ COPY IT IMMEDIATELY** - You won't see it again!
3. The token looks like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. Click **"Copy"** or manually select and copy

### Step 4: Add to GitHub

1. Go to your GitHub repository:
   - https://github.com/niyogen/agenthub-gateway/settings/secrets/actions

2. Click **"New repository secret"**

3. Fill in:
   - **Name:** `VERCEL_TOKEN`
   - **Secret:** Paste your token
   - Click **"Add secret"**

## Token Format

Vercel tokens typically look like:
```
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

They are usually:
- 40-50 characters long
- Alphanumeric
- No spaces or special characters (except dashes/underscores)

## Security Notes

✅ **Do:**
- Use a descriptive name (e.g., "GitHub Actions")
- Store in GitHub Secrets (not in code)
- Use "No expiration" for CI/CD tokens
- Keep it secure and private

❌ **Don't:**
- Commit tokens to git
- Share tokens publicly
- Use the same token for multiple purposes (if possible)
- Let tokens expire without renewal

## Verify Token Works

After adding to GitHub Secrets, test it:

1. Go to GitHub Actions
2. Trigger a workflow
3. Check if deployment succeeds
4. If it fails with "unauthorized", verify the token is correct

## Troubleshooting

### "Token not found" error
- Verify token is in GitHub Secrets as `VERCEL_TOKEN`
- Check spelling (case-sensitive)
- Make sure it's a repository secret, not environment secret

### "Unauthorized" error
- Token might be expired
- Token might not have correct permissions
- Create a new token and update GitHub Secrets

### "Invalid token" error
- Token might be copied incorrectly
- Check for extra spaces
- Create a new token

## Alternative: Using Vercel CLI

If you have Vercel CLI installed, you can also get token info:

```bash
vercel whoami
```

But this doesn't show the token itself - you still need to create it in the dashboard.

## Quick Reference

| Item | Value |
|------|-------|
| **Token Page** | https://vercel.com/account/tokens |
| **GitHub Secrets** | https://github.com/niyogen/agenthub-gateway/settings/secrets/actions |
| **Token Name** | `VERCEL_TOKEN` |
| **Expiration** | No expiration (recommended for CI/CD) |

## Next Steps

After getting the token:

1. ✅ Add `VERCEL_TOKEN` to GitHub Secrets
2. ✅ Verify `VERCEL_ORG_ID` is set: `team_3ABD9xuy4MGJKTHm4L3HD2Sh`
3. ✅ Verify `VERCEL_PROJECT_ID` is set: `prj_yogugzXjOFH96JnPLFRD9C87o1gE`
4. ✅ Test the CI/CD pipeline

## Need Help?

If you're still having issues:
1. Make sure you're logged into Vercel
2. Check you have access to the project
3. Try creating a new token
4. Verify all secrets are added correctly in GitHub

