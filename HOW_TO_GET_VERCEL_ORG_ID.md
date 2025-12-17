# How to Get VERCEL_ORG_ID

There are several ways to get your Vercel Organization ID. Here are the easiest methods:

## Method 1: Using Vercel CLI (Easiest) ⭐

If you have Vercel CLI installed:

```bash
cd client-next
vercel link
```

This will show:
- Organization ID
- Project ID

Or check existing `.vercel` folder:

```bash
cd client-next
cat .vercel/project.json | grep orgId
cat .vercel/org.json | grep orgId
```

## Method 2: From Vercel Dashboard

1. Go to [Vercel Account Settings](https://vercel.com/account)
2. Look for **"Team ID"** or **"Organization ID"**
3. It's usually shown in the format: `team_xxxxxxxxxxxxx` or `org_xxxxxxxxxxxxx`

## Method 3: From Project Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project (`client-next`)
3. Go to **Settings** → **General**
4. Look for **"Organization ID"** in the project details

## Method 4: From URL

When you're in your Vercel project:
- The URL might be: `https://vercel.com/[org-id]/[project-name]`
- The `[org-id]` part is your Organization ID

## Method 5: Using Vercel API

If you have a Vercel token:

```bash
curl -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  https://api.vercel.com/v2/teams
```

This returns all teams/orgs you belong to with their IDs.

## Method 6: Check Existing Deployments

If you've deployed before:

1. Go to your project in Vercel Dashboard
2. Click on any deployment
3. Check the deployment URL or settings
4. Organization ID might be visible in the project path

## Quick Script

Run this helper script:

```bash
./scripts/get-vercel-org-id.sh
```

Or manually check:

```bash
cd client-next
cat .vercel/project.json 2>/dev/null | grep -o '"orgId":"[^"]*"'
```

## Format

Vercel Organization IDs are usually in one of these formats:
- `team_xxxxxxxxxxxxx` (for teams)
- `org_xxxxxxxxxxxxx` (for personal orgs)
- Sometimes just the ID without prefix

**Note:** Use the full value including the prefix (`team_` or `org_`) when adding to GitHub Secrets.

## Still Can't Find It?

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Link your project:**
   ```bash
   cd client-next
   vercel link
   ```
   
   This will prompt you to:
   - Select your organization
   - Select your project
   - Show you the IDs

3. **Check the output** - it will display both Organization ID and Project ID

## Example Output

When you run `vercel link`, you'll see something like:

```
? Set up and deploy "~/client-next"? [Y/n] y
? Which scope? Your Name (your-org-id)
? Link to existing project? [y/N] n
? What's your project's name? client-next
? In which directory is your code located? ./
```

The `your-org-id` shown is your **VERCEL_ORG_ID**.

## Need Help?

If you still can't find it:
1. Make sure you're logged into Vercel
2. Check you have access to the project
3. Try creating a new token in Vercel Dashboard (it might show org info)
4. Contact Vercel support if needed




