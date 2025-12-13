# GitHub Actions Workflows

## Available Workflows

### 1. `deploy.yml` - Deploy Server to AWS
- Triggers on `server/**` changes
- Builds Docker image
- Deploys to AWS ECS Fargate

### 2. `deploy-client-next.yml` - Deploy Client to Vercel (Full Pipeline)
- Triggers on `client-next/**` changes
- Runs linting and build checks
- Deploys to Vercel production
- Creates preview deployments for PRs

### 3. `deploy-client-next-simple.yml` - Deploy Client to Vercel (Simple)
- Triggers on `client-next/**` changes
- Fast deployment without extensive checks
- Production deployments only

## Setup

See `VERCEL_CI_CD_SETUP.md` for detailed setup instructions.

## Required Secrets

### For Server Deployment:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### For Client Deployment:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `BACKEND_API_URL` (optional)
