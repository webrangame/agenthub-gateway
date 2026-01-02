# HTTPS Setup - Complete Guide

## ✅ Current Status

- **AWS Credentials**: Configured and verified
- **Target Group**: `fastgraph-gateway-tg` (port 8081) ✅
- **ALB Security Group**: `sg-08fc88af5269b73a2` ✅
- **ECS Security Group**: Updated to allow ALB traffic ✅
- **SSL Certificate**: Found for `agentgateway.niyogen.com` (PENDING_VALIDATION)
- **ALB**: Needs manual creation (account restriction)

## 🔐 SSL Certificate Validation

**Certificate ARN**: `arn:aws:acm:us-east-1:582604091763:certificate/5d64b7da-22ec-431b-9c31-9f25638daeae`

**Status**: PENDING_VALIDATION

**DNS Validation Record** (add this to your DNS):
```
Type: CNAME
Name: _a538360555d49fa8eba68b5cac707221.agentgateway.niyogen.com.
Value: _b390e022edc47117ae8c4c94cd35810a.jkddzztszm.acm-validations.aws.
```

**To validate**:
1. Add the CNAME record above to your DNS provider for `agentgateway.niyogen.com`
2. Wait 5-10 minutes
3. Check status:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:582604091763:certificate/5d64b7da-22ec-431b-9c31-9f25638daeae \
  --region us-east-1 \
  --query "Certificate.Status"
```
4. Once status is `ISSUED`, proceed with HTTPS setup

## 🚀 Step-by-Step HTTPS Setup

### Step 1: Create ALB via AWS Console

**Direct Link**: https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:

1. Click **"Create Load Balancer"**
2. Select **"Application Load Balancer"**
3. Configure:
   - **Name**: `fastgraph-gateway-alb`
   - **Scheme**: `Internet-facing`
   - **IP address type**: `IPv4`
   - **VPC**: Default VPC
   - **Availability Zones**: Select at least 2 subnets in different AZs
   - **Security groups**: `fastgraph-gateway-alb-sg` (sg-08fc88af5269b73a2)
   - **Listener**: HTTP on port 80
   - **Default action**: Forward to `fastgraph-gateway-tg`
4. Click **"Create load balancer"**
5. Wait 2-3 minutes for status to become **"Active"**

### Step 2: Update ECS Service to Use ALB

```bash
# Get subnet IDs (you'll need to find these from your VPC)
# Run: aws ec2 describe-subnets --filters "Name=vpc-id,Values=<YOUR_VPC_ID>" --query "Subnets[*].SubnetId" --output text

TG_ARN="arn:aws:elasticloadbalancing:us-east-1:582604091763:targetgroup/fastgraph-gateway-tg/b494c55a52fbf334"
SG_ID="sg-09b0a45e013710d8a"
SUBNET_IDS="subnet-xxxxx subnet-yyyyy"  # Replace with actual subnet IDs

aws ecs update-service \
  --cluster fastgraph-cluster \
  --service fastgraph-gateway-service \
  --load-balancers targetGroupArn=${TG_ARN},containerName=fastgraph-gateway,containerPort=8081 \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_ID}],assignPublicIp=DISABLED}" \
  --region us-east-1
```

### Step 3: Add HTTPS Listener

**After ALB is active AND certificate is ISSUED**, run:

```bash
cd server
./add-https-listener.sh
```

This script will:
- Find the ALB
- Use the SSL certificate for `agentgateway.niyogen.com`
- Create HTTPS listener on port 443
- Configure secure TLS policy

### Step 4: Test HTTPS

```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names fastgraph-gateway-alb \
  --region us-east-1 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

# Test HTTP
curl http://${ALB_DNS}/health

# Test HTTPS
curl https://${ALB_DNS}/health
curl https://${ALB_DNS}/api/feed

# Or use domain (if DNS is configured)
curl https://agentgateway.niyogen.com/health
```

### Step 5: Update Frontend Configuration

Update all API URLs to use HTTPS:

**Option A: Use ALB DNS**
```bash
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names fastgraph-gateway-alb \
  --region us-east-1 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

# Update vercel.json
# Use: https://${ALB_DNS}
```

**Option B: Use Domain Name** (recommended)
```bash
# Update vercel.json
# Use: https://agentgateway.niyogen.com
```

**Files to update**:
1. `client-next/vercel.json`:
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://agentgateway.niyogen.com",
    "BACKEND_API_URL": "https://agentgateway.niyogen.com",
    "FEED_API_URL": "https://agentgateway.niyogen.com"
  }
}
```

2. `client-next/app/utils/api.ts`:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentgateway.niyogen.com';
```

3. Vercel environment variables:
```bash
cd client-next
echo "https://agentgateway.niyogen.com" | vercel env add BACKEND_API_URL production
echo "https://agentgateway.niyogen.com" | vercel env add FEED_API_URL production
```

## 📋 Quick Checklist

- [ ] Add DNS validation record for SSL certificate
- [ ] Wait for certificate to become `ISSUED`
- [ ] Create ALB via AWS Console
- [ ] Update ECS service to use ALB
- [ ] Run `./add-https-listener.sh`
- [ ] Test HTTPS endpoints
- [ ] Update frontend configuration
- [ ] Test frontend with HTTPS API

## 🔍 Troubleshooting

### Certificate Not Validating
- Verify DNS record is correct
- Wait 5-10 minutes after adding DNS record
- Check certificate status: `aws acm describe-certificate --certificate-arn <ARN> --region us-east-1`

### ALB Health Checks Failing
- Check ECS tasks are running: `aws ecs list-tasks --cluster fastgraph-cluster --service-name fastgraph-gateway-service`
- Verify security group allows ALB → ECS on port 8081
- Check health check path: `/health`

### HTTPS Not Working
- Verify certificate status is `ISSUED`
- Check HTTPS listener exists: `aws elbv2 describe-listeners --load-balancer-arn <ALB_ARN>`
- Test with verbose curl: `curl -v https://ALB-DNS/health`

## 📞 Support

If you encounter issues:
1. Check AWS CloudWatch logs: `/ecs/fastgraph-gateway`
2. Check ALB target group health in AWS Console
3. Verify all security group rules are correct

