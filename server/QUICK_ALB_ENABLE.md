# Quick Guide: Enable ALB in AWS

## The Problem

You're getting this error:
```
OperationNotPermitted: This AWS account currently does not support creating load balancers
```

## Quick Solution (5 minutes)

### Step 1: Contact AWS Support

1. **Go to**: https://console.aws.amazon.com/support/
2. **Click**: "Create case"
3. **Fill in**:
   - **Case type**: Service limit increase
   - **Service**: Elastic Load Balancing
   - **Limit type**: Application Load Balancers per region
   - **Region**: us-east-1
   - **New limit value**: 5
4. **Description** (copy-paste):
   ```
   I need to enable the Elastic Load Balancing service for my AWS account.
   Currently getting "OperationNotPermitted" error when trying to create an ALB.
   Please enable ELB service and allow creation of Application Load Balancers.
   ```
5. **Submit**

### Step 2: Wait (24 hours)

AWS Support typically responds within 24 hours.

### Step 3: Verify Service is Enabled

```bash
cd server
./check-alb-service-status.sh
```

If it shows "✅ ELB service is ENABLED", proceed to Step 4.

### Step 4: Create ALB

```bash
cd server
./setup-alb-https.sh
```

### Step 5: Test

```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names fastgraph-gateway-alb \
  --region us-east-1 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

# Test
curl http://${ALB_DNS}/health
```

## Alternative: Use Cloudflare Tunnel (Free, No Wait)

If you don't want to wait for AWS Support:

1. **Set up Cloudflare Tunnel** (free, works immediately)
2. **Provides**: Stable DNS + HTTPS
3. **See**: `server/CLOUDFLARE_HTTPS_SETUP.md`

## Check Current Status

```bash
cd server
./check-alb-service-status.sh
```

This will tell you:
- ✅ If ELB service is enabled
- ❌ If it's not enabled (and what to do)
- Current quotas and permissions

## Full Documentation

For detailed instructions, see: `server/ENABLE_ALB_GUIDE.md`

