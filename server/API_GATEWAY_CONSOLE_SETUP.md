# API Gateway Console Setup - Step by Step

## ✅ What's Already Done

- REST API created: `ql3aoaj2x0`
- Proxy resource `{proxy+}` created
- Basic structure in place

## 🔧 Complete Setup via Console (5 minutes)

### Step 1: Open API Gateway Console

**Direct Link**: https://console.aws.amazon.com/apigateway/home?region=us-east-1#/apis/ql3aoaj2x0

### Step 2: Configure the ANY Method

1. In the left sidebar, click on **`{proxy+}`** resource
2. You should see **ANY** method listed
3. Click on **ANY** method
4. You'll see the method execution screen

### Step 3: Fix Integration (if needed)

1. In the **Integration Request** section:
   - **Integration type**: Should be `HTTP Proxy`
   - **Endpoint URL**: Should be `http://107.23.26.219:8081/{proxy}`
   - If not correct, click **Edit**:
     - Change to: `HTTP Proxy`
     - Endpoint URL: `http://107.23.26.219:8081/{proxy}`
     - HTTP method: `ANY`
     - Click **Save**

2. **Important**: In the **Integration Request** section, expand **URL Path Parameters**:
   - Add mapping: `proxy` → `method.request.path.proxy`
   - This ensures the path is passed correctly

### Step 4: Test the Method

1. Click the **TEST** button (top right)
2. Enter path: `/health` (without leading slash in some cases, or try `health`)
3. Click **Test**
4. Check the response - should return your backend response

### Step 5: Enable CORS (Optional but Recommended)

1. Select the `{proxy+}` resource
2. Click **Actions** → **Enable CORS**
3. Configure:
   - **Access-Control-Allow-Origin**: `*`
   - **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key`
   - **Access-Control-Allow-Methods**: `GET,POST,PUT,DELETE,OPTIONS`
4. Click **Enable CORS and replace existing CORS headers**

### Step 6: Deploy API

1. Click **Actions** → **Deploy API**
2. **Deployment stage**: Select `prod` (or create new)
3. **Deployment description**: `Production deployment with HTTPS`
4. Click **Deploy**

### Step 7: Test Invoke URL

After deployment, test:
```bash
curl https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/health
```

### Step 8: Set Up Custom Domain (HTTPS)

1. In API Gateway, click **"Custom Domain Names"** (left sidebar)
2. Click **"Create"**
3. Configure:
   - **Domain name**: `agentgateway.niyogen.com`
   - **Certificate**: Select ACM certificate
     - Certificate ARN: `arn:aws:acm:us-east-1:582604091763:certificate/5d64b7da-22ec-431b-9c31-9f25638daeae`
   - **Endpoint type**: Regional
4. Click **"Create Domain Name"**

### Step 9: Create Base Path Mapping

1. After domain is created, click on it
2. Go to **"API mappings"** tab
3. Click **"Configure API mappings"**
4. Click **"Add new mapping"**
5. Configure:
   - **API**: `fastgraph-gateway-api` (ql3aoaj2x0)
   - **Stage**: `prod`
   - **Path**: (leave empty for root)
6. Click **"Save"**

### Step 10: Update DNS

1. Note the **Target domain name** (e.g., `d-xxxxx.execute-api.us-east-1.amazonaws.com`)
2. Go to Cloudflare Dashboard (or your DNS provider)
3. Add CNAME record:
   - **Name**: `agentgateway`
   - **Value**: `<target-domain>` (from step 1)
   - **Proxy**: ON (if using Cloudflare)
4. Save

### Step 11: Test HTTPS

Wait 5-10 minutes, then:
```bash
curl https://agentgateway.niyogen.com/health
curl https://agentgateway.niyogen.com/api/feed
```

## 🔍 Troubleshooting

### Internal Server Error (500)

**Fix via Console**:
1. Go to API Gateway → Your API → `{proxy+}` → `ANY`
2. Check **Integration Request**:
   - Ensure URL is: `http://107.23.26.219:8081/{proxy}`
   - Check **URL Path Parameters** mapping
3. Check **Method Request**:
   - Ensure path parameter `proxy` is defined
4. Redeploy API

### 403 Forbidden

- Check method authorization is set to `NONE`
- Verify API is deployed
- Check if API key is required (should be disabled)

### Path Not Working

- Verify `{proxy+}` resource exists
- Check integration URL uses `{proxy}` placeholder
- Ensure path parameter mapping is configured

## 📊 Current API Details

- **API ID**: `ql3aoaj2x0`
- **API Name**: `fastgraph-gateway-api`
- **Region**: `us-east-1`
- **Invoke URL**: `https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod`
- **Backend**: `http://107.23.26.219:8081`

## 💡 Quick Fixes

### If Integration Not Working:

1. **Delete and recreate the method**:
   - Delete ANY method
   - Create new ANY method
   - Set integration to HTTP Proxy
   - URL: `http://107.23.26.219:8081/{proxy}`

2. **Or use HTTP Integration instead**:
   - Change integration type to `HTTP` (not HTTP_PROXY)
   - Endpoint URL: `http://107.23.26.219:8081`
   - This requires configuring each endpoint separately

## ✅ Success Checklist

- [ ] API Gateway created
- [ ] Proxy resource configured
- [ ] Method created and tested
- [ ] Integration working (test returns backend response)
- [ ] API deployed to prod stage
- [ ] Custom domain created
- [ ] Base path mapping configured
- [ ] DNS updated
- [ ] HTTPS working
- [ ] Frontend updated
