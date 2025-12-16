# API Gateway Connection Status

## ✅ Configuration Complete

### What's Configured:

1. **REST API**: `ql3aoaj2x0`
2. **Proxy Resource**: `{proxy+}` with path parameter mapping
3. **Integration**: HTTP_PROXY to `http://107.23.26.219:8081/{proxy}`
4. **Method**: ANY with path parameter `method.request.path.proxy`
5. **Deployment**: Deployed to `prod` stage

### Current Status:

- ✅ API Gateway created
- ✅ Integration configured
- ✅ Path mapping set up
- ⚠️  Testing shows 500 errors (needs troubleshooting)

## 🔍 Troubleshooting Steps

### 1. Verify Backend Accessibility

```bash
# Test backend directly
curl http://107.23.26.219:8081/health
# Should return: {"status":"ok","service":"guardian-gateway"}
```

### 2. Check API Gateway Test Feature

Go to API Gateway Console:
- https://console.aws.amazon.com/apigateway/home?region=us-east-1#/apis/ql3aoaj2x0/resources/qv39ag/methods/ANY
- Click "TEST"
- Path: `health`
- Click "Test"
- Check response and logs

### 3. Enable CloudWatch Logs

Execution logs are now enabled. Check CloudWatch:
- Log Group: `/aws/apigateway/ql3aoaj2x0`
- Look for error messages

### 4. Common Issues

#### Issue: 500 Internal Server Error

**Possible Causes:**
1. **Network connectivity**: API Gateway can't reach backend
2. **Security Group**: Backend security group blocking API Gateway IPs
3. **Integration timeout**: Backend taking too long to respond
4. **Path mapping**: Incorrect path being sent to backend

**Solutions:**

1. **Check Security Group**:
   - Backend ECS security group should allow inbound from `0.0.0.0/0` on port 8081
   - Or allow from API Gateway VPC endpoints

2. **Verify Integration URL**:
   - Should be: `http://107.23.26.219:8081/{proxy}`
   - Path parameter mapping: `integration.request.path.proxy` → `method.request.path.proxy`

3. **Test with Different Path**:
   ```bash
   # Try root path
   curl https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/
   
   # Try with full path
   curl https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/health
   ```

### 5. Manual Console Fix

If CLI configuration isn't working, use console:

1. **Go to Integration Request**:
   - API Gateway → Your API → `{proxy+}` → `ANY` → Integration Request
   - Verify Endpoint URL: `http://107.23.26.219:8081/{proxy}`
   - Check URL Path Parameters:
     - Name: `proxy`
     - Mapped from: `method.request.path.proxy`

2. **Check Integration Response**:
   - Integration Response → 200
   - Response Templates: `application/json` → (empty or `$input.json('$')`)

3. **Test in Console**:
   - Click "TEST" button
   - Path: `health`
   - Check response

## 📋 Next Steps

1. ✅ Verify backend is accessible
2. ✅ Check CloudWatch logs for errors
3. ✅ Test via console TEST feature
4. ✅ Verify security group allows API Gateway
5. ✅ Set up custom domain for HTTPS

## 🔗 Useful Links

- **API Gateway Console**: https://console.aws.amazon.com/apigateway/home?region=us-east-1#/apis/ql3aoaj2x0
- **Test Method**: https://console.aws.amazon.com/apigateway/home?region=us-east-1#/apis/ql3aoaj2x0/resources/qv39ag/methods/ANY
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups

## 🧪 Test Commands

```bash
# Test backend
curl http://107.23.26.219:8081/health

# Test API Gateway
curl https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/health

# Test feed
curl https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod/api/feed
```
