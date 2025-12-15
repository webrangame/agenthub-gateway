# AWS API Gateway Setup Guide

## Overview

AWS API Gateway provides a managed service to create, publish, maintain, monitor, and secure REST APIs. This guide shows how to set up API Gateway for your FastGraph Gateway API with HTTPS support.

## Prerequisites

- AWS account with API Gateway permissions
- Domain name: `agentgateway.niyogen.com`
- SSL certificate in ACM (already have: `agentgateway.niyogen.com`)
- Backend API running at: `http://107.23.26.219:8081`

## Cost

- **REST API**: $3.50 per million API calls
- **Data Transfer**: Standard AWS data transfer rates
- **Custom Domain**: Free (but requires ACM certificate)

## Method 1: Automated Script

```bash
cd server
./setup-api-gateway.sh
```

This will:
- Check API Gateway availability
- Create REST API
- Set up basic structure
- Provide next steps

## Method 2: Manual Setup via AWS Console (Recommended)

### Step 1: Create REST API

1. Go to: **https://console.aws.amazon.com/apigateway/home?region=us-east-1**
2. Click **"Create API"**
3. Choose **"REST API"** → **"Build"**
4. Select **"New API"**
5. Configure:
   - **API name**: `fastgraph-gateway-api`
   - **Description**: `FastGraph Gateway API with HTTPS`
   - **Endpoint Type**: Regional
6. Click **"Create API"**

### Step 2: Create Proxy Resource

1. In your API, click **"Actions"** → **"Create Resource"**
2. Check **"Configure as proxy resource"**
3. Resource name: `{proxy+}`
4. Click **"Create Resource"**

### Step 3: Create Method

1. Select the `{proxy+}` resource
2. Click **"Actions"** → **"Create Method"**
3. Select **"ANY"** from dropdown (or create GET, POST separately)
4. Click the checkmark
5. Configure:
   - **Integration type**: HTTP Proxy
   - **Endpoint URL**: `http://107.23.26.219:8081/{proxy}`
   - **HTTP method**: ANY (or match your method)
   - **Content handling**: Passthrough
6. Click **"Save"**
7. Click **"OK"** on the method execution screen

### Step 4: Enable CORS (if needed)

1. Select the `{proxy+}` resource
2. Click **"Actions"** → **"Enable CORS"**
3. Configure:
   - **Access-Control-Allow-Origin**: `*` (or your frontend domain)
   - **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key`
   - **Access-Control-Allow-Methods**: `GET,POST,PUT,DELETE,OPTIONS`
4. Click **"Enable CORS and replace existing CORS headers"**

### Step 5: Deploy API

1. Click **"Actions"** → **"Deploy API"**
2. Configure:
   - **Deployment stage**: `prod` (or create new: `production`)
   - **Deployment description**: `Initial deployment`
3. Click **"Deploy"**

### Step 6: Get Invoke URL

After deployment, you'll see:
- **Invoke URL**: `https://<api-id>.execute-api.us-east-1.amazonaws.com/prod`

Test it:
```bash
curl https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/health
```

### Step 7: Set Up Custom Domain (HTTPS)

1. In API Gateway, go to **"Custom Domain Names"** (left sidebar)
2. Click **"Create"**
3. Configure:
   - **Domain name**: `agentgateway.niyogen.com`
   - **Certificate**: Select ACM certificate for `agentgateway.niyogen.com`
   - **Endpoint type**: Regional
4. Click **"Create Domain Name"**

### Step 8: Create Base Path Mapping

1. After domain is created, click on it
2. Go to **"API mappings"** tab
3. Click **"Configure API mappings"**
4. Click **"Add new mapping"**
5. Configure:
   - **API**: Select `fastgraph-gateway-api`
   - **Stage**: `prod`
   - **Path**: (leave empty for root, or use `/api`)
6. Click **"Save"**

### Step 9: Update DNS

1. Note the **Target domain name** from Custom Domain (e.g., `d-xxxxx.execute-api.us-east-1.amazonaws.com`)
2. Go to your DNS provider (or Cloudflare)
3. Add CNAME record:
   - **Name**: `agentgateway`
   - **Value**: `d-xxxxx.execute-api.us-east-1.amazonaws.com`
   - **TTL**: Auto
4. Save

### Step 10: Test HTTPS

Wait 5-10 minutes for DNS propagation, then:

```bash
curl https://agentgateway.niyogen.com/health
curl https://agentgateway.niyogen.com/api/feed
```

## Method 3: Using AWS CLI (Advanced)

### Create REST API

```bash
API_ID=$(aws apigateway create-rest-api \
    --name fastgraph-gateway-api \
    --description "FastGraph Gateway API" \
    --endpoint-configuration types=REGIONAL \
    --region us-east-1 \
    --query "id" \
    --output text)

echo "API ID: $API_ID"
```

### Get Root Resource

```bash
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region us-east-1 \
    --query "items[?path=='/'].id" \
    --output text)

echo "Root Resource ID: $ROOT_ID"
```

### Create Proxy Resource

```bash
PROXY_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part "{proxy+}" \
    --region us-east-1 \
    --query "id" \
    --output text)

echo "Proxy Resource ID: $PROXY_ID"
```

### Create ANY Method

```bash
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $PROXY_ID \
    --http-method ANY \
    --authorization-type NONE \
    --region us-east-1
```

### Set Up Integration

```bash
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $PROXY_ID \
    --http-method ANY \
    --type HTTP_PROXY \
    --integration-http-method ANY \
    --uri "http://107.23.26.219:8081/{proxy}" \
    --region us-east-1
```

### Deploy API

```bash
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region us-east-1
```

## Update Frontend Configuration

Once API Gateway is set up and HTTPS is working:

**Update `client-next/vercel.json`**:
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://agentgateway.niyogen.com",
    "BACKEND_API_URL": "https://agentgateway.niyogen.com",
    "FEED_API_URL": "https://agentgateway.niyogen.com"
  }
}
```

**Update `client-next/app/utils/api.ts`**:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentgateway.niyogen.com';
```

## API Gateway vs Other Methods

| Feature | API Gateway | Cloudflare DNS | Cloudflare Tunnel | ALB |
|---------|-------------|----------------|-------------------|-----|
| Cost | $3.50/M requests | FREE | FREE | ~$16/month |
| HTTPS | ✅ | ✅ | ✅ | ✅ |
| Setup Time | 20-30 min | 2 min | 5-10 min | 15-20 min |
| Stability | Excellent | Good | Excellent | Excellent |
| Account Restrictions | May apply | None | None | Applied |

## Troubleshooting

### API Gateway Not Available

If you get permission errors:
1. Check IAM permissions for API Gateway
2. Contact AWS Support to enable API Gateway service
3. Use alternative: Cloudflare DNS Proxy (Method 1 in HTTPS_ALTERNATIVES.md)

### 502 Bad Gateway

1. Check backend is running: `curl http://107.23.26.219:8081/health`
2. Verify integration URL is correct
3. Check API Gateway logs in CloudWatch

### CORS Issues

1. Enable CORS in API Gateway
2. Add CORS headers in integration response
3. Check frontend is using correct origin

### Custom Domain Not Working

1. Verify DNS CNAME record is correct
2. Wait 5-10 minutes for DNS propagation
3. Check certificate is issued and in us-east-1
4. Verify base path mapping is configured

## Quick Test Commands

```bash
# Test API Gateway invoke URL
curl https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/health

# Test custom domain
curl https://agentgateway.niyogen.com/health

# Test API feed
curl https://agentgateway.niyogen.com/api/feed
```

## Next Steps

1. ✅ Create REST API
2. ✅ Set up proxy integration
3. ✅ Deploy to production stage
4. ✅ Configure custom domain
5. ✅ Update DNS
6. ✅ Test HTTPS
7. ✅ Update frontend configuration

## Resources

- API Gateway Console: https://console.aws.amazon.com/apigateway/
- Documentation: https://docs.aws.amazon.com/apigateway/
- Pricing: https://aws.amazon.com/api-gateway/pricing/
