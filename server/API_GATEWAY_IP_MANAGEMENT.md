# API Gateway IP Management

## Problem

When you redeploy your ECS Fargate service, the task gets a **new public IP address**. Since API Gateway integration is hardcoded to a specific IP (`http://107.23.26.219:8081`), the connection will break after redeployment.

## Solution Options

### Option 1: Automatic IP Update Script (Recommended)

Run this script after each ECS deployment to automatically update API Gateway:

```bash
cd server
chmod +x update-api-gateway-ip.sh
./update-api-gateway-ip.sh
```

**What it does:**
1. Finds the running ECS task
2. Gets the new public IP
3. Updates API Gateway integration
4. Redeploys the API
5. Tests the connection

### Option 2: Integrate into CI/CD Pipeline

Add to your GitHub Actions workflow or deployment script:

```yaml
# In .github/workflows/deploy-client-next.yml or similar
- name: Update API Gateway IP
  run: |
    cd server
    ./update-api-gateway-ip.sh
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Option 3: Scheduled Lambda Function

Create a Lambda function that runs every 5 minutes to check and update the IP:

```python
import boto3
import json

def lambda_handler(event, context):
    # Get ECS task IP
    ecs = boto3.client('ecs')
    apigateway = boto3.client('apigateway')
    
    # Your logic here
    # See: server/lambda-update-api-gateway.py (to be created)
    
    return {
        'statusCode': 200,
        'body': json.dumps('IP updated successfully')
    }
```

### Option 4: Use Application Load Balancer (ALB)

**Best long-term solution** - ALB provides a stable DNS endpoint that doesn't change:

- ✅ Stable endpoint (doesn't change with redeployments)
- ✅ Health checks
- ✅ SSL/TLS termination
- ✅ Cost: ~$16/month

**Note**: You previously had permission issues with ALB. If you can get AWS Support to enable it, this is the best option.

### Option 5: Use Cloudflare Tunnel

**Free alternative** - Provides stable DNS and HTTPS:

- ✅ Free
- ✅ Stable endpoint
- ✅ Automatic HTTPS
- ✅ Works with dynamic IPs

See: `server/CLOUDFLARE_HTTPS_SETUP.md`

### Option 6: Use ECS Service Discovery

If your ECS tasks are in a VPC, use Service Discovery for internal DNS:

- ✅ Stable DNS name
- ✅ Automatic IP updates
- ⚠️  Requires VPC configuration
- ⚠️  Internal only (needs ALB/NLB for public access)

## Quick Setup

### 1. Update Script Configuration

Edit `update-api-gateway-ip.sh`:

```bash
CLUSTER_NAME="fastgraph-gateway-cluster"  # Your ECS cluster name
SERVICE_NAME="fastgraph-gateway-service"  # Your ECS service name
```

### 2. Get Your Cluster/Service Names

```bash
# List clusters
aws ecs list-clusters --region us-east-1

# List services in a cluster
aws ecs list-services --cluster <cluster-name> --region us-east-1
```

### 3. Test the Script

```bash
cd server
chmod +x update-api-gateway-ip.sh
./update-api-gateway-ip.sh
```

### 4. Add to Deployment Process

After deploying ECS:

```bash
# Deploy ECS service
aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment

# Wait for deployment
aws ecs wait services-stable --cluster <cluster> --services <service>

# Update API Gateway
./server/update-api-gateway-ip.sh
```

## Monitoring

### Check Current IP

```bash
# Get current API Gateway backend IP
aws apigateway get-integration \
    --rest-api-id ql3aoaj2x0 \
    --resource-id qv39ag \
    --http-method ANY \
    --region us-east-1 \
    --query "uri" \
    --output text
```

### Check ECS Task IP

```bash
# Get ECS task IP
./server/update-api-gateway-ip.sh  # Shows both IPs
```

### Set Up Alerts

Create a CloudWatch alarm that triggers when:
- API Gateway returns 5xx errors
- Health check fails
- IP mismatch detected

## Best Practices

1. **Always run update script after ECS deployment**
2. **Monitor API Gateway errors** in CloudWatch
3. **Consider ALB** for production (if permissions allow)
4. **Use Cloudflare Tunnel** as free alternative
5. **Set up automated checks** (Lambda or scheduled script)

## Troubleshooting

### Script Fails: "No running tasks found"

- Check cluster and service names are correct
- Verify ECS service is running
- Check AWS credentials and region

### Script Fails: "Could not get public IP"

- Task may not have public IP assigned
- Check task networking configuration
- Verify ENI association

### API Gateway Still Returns Errors

- Wait 30-60 seconds after deployment
- Check backend is responding: `curl http://<new-ip>:8081/health`
- Verify integration was updated correctly
- Check CloudWatch logs

## Current Configuration

- **API Gateway ID**: `ql3aoaj2x0`
- **Current Backend**: `http://107.23.26.219:8081`
- **Update Script**: `server/update-api-gateway-ip.sh`
- **Auto-Check Script**: `server/auto-update-api-gateway.sh`

## Next Steps

1. ✅ Update script configuration with your cluster/service names
2. ✅ Test the script manually
3. ✅ Integrate into deployment pipeline
4. ✅ Set up monitoring/alerts
5. ✅ Consider ALB or Cloudflare Tunnel for long-term solution
