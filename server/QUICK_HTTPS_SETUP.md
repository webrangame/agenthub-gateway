# Quick HTTPS Setup Guide

## Current Status

✅ **AWS Credentials**: Configured  
✅ **Target Group**: Created (port 8081)  
✅ **Security Groups**: Configured  
✅ **SSL Certificate**: Found for `agentgateway.niyogen.com` (may need validation)  
❌ **ALB**: Needs to be created manually (account restriction)

## Quick Steps to Enable HTTPS

### Step 1: Create ALB via AWS Console

1. Go to: https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:
2. Click **"Create Load Balancer"**
3. Select **"Application Load Balancer"**
4. Configure:
   - **Name**: `fastgraph-gateway-alb`
   - **Scheme**: Internet-facing
   - **VPC**: Default VPC
   - **Subnets**: Select 2+ subnets in different AZs
   - **Security Group**: `fastgraph-gateway-alb-sg` (sg-08fc88af5269b73a2)
   - **Listener**: HTTP on port 80 → Forward to `fastgraph-gateway-tg`
5. Click **"Create load balancer"**
6. Wait 2-3 minutes for it to become **Active**

### Step 2: Add HTTPS Listener

Once ALB is active, run:

```bash
cd server
./add-https-listener.sh
```

This will:
- Add HTTPS listener on port 443
- Use SSL certificate for `agentgateway.niyogen.com`
- Configure secure TLS policy

### Step 3: Update ECS Service (if not done)

```bash
TG_ARN="arn:aws:elasticloadbalancing:us-east-1:582604091763:targetgroup/fastgraph-gateway-tg/b494c55a52fbf334"

# Get your subnet IDs (replace with actual values)
SUBNET_IDS="subnet-xxxxx subnet-yyyyy"

SG_ID="sg-09b0a45e013710d8a"

aws ecs update-service \
  --cluster fastgraph-cluster \
  --service fastgraph-gateway-service \
  --load-balancers targetGroupArn=${TG_ARN},containerName=fastgraph-gateway,containerPort=8081 \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_ID}],assignPublicIp=DISABLED}" \
  --region us-east-1
```

### Step 4: Test HTTPS

```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names fastgraph-gateway-alb \
  --region us-east-1 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

# Test HTTPS
curl https://${ALB_DNS}/health
curl https://${ALB_DNS}/api/feed
```

### Step 5: Update Frontend

Update all API URLs to use HTTPS:

```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names fastgraph-gateway-alb \
  --region us-east-1 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

# Update vercel.json (or use domain if DNS is configured)
# Use: https://${ALB_DNS} or https://agentgateway.niyogen.com
```

## SSL Certificate Status

Current certificate: `agentgateway.niyogen.com`

**If certificate is PENDING_VALIDATION:**

1. Get validation records:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:582604091763:certificate/5d64b7da-22ec-431b-9c31-9f25638daeae \
  --region us-east-1 \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord"
```

2. Add the CNAME record to your DNS (for `agentgateway.niyogen.com`)

3. Wait 5-10 minutes for validation

4. Check status:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:582604091763:certificate/5d64b7da-22ec-431b-9c31-9f25638daeae \
  --region us-east-1 \
  --query "Certificate.Status"
```

5. Once status is `ISSUED`, run `./add-https-listener.sh`

## Troubleshooting

### Certificate Validation
- Check DNS records are correct
- Wait 5-10 minutes after adding DNS records
- Certificate must be in `us-east-1` region for ALB

### ALB Health Checks
- Ensure ECS tasks are running
- Check security groups allow ALB → ECS on port 8081
- Verify health check path: `/health`

### HTTPS Not Working
- Verify certificate is `ISSUED` status
- Check HTTPS listener exists on port 443
- Test with: `curl -v https://ALB-DNS/health`
