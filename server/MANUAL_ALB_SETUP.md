# Manual ALB Setup via AWS Console with HTTPS

Since the script couldn't create the load balancer due to account permissions, you can create it manually via the AWS Console. After creating the ALB, we'll add HTTPS support.

## Prerequisites ✅

The following are already created and ready:
- **Target Group**: `fastgraph-gateway-tg` (port 8081)
- **ALB Security Group**: `sg-08fc88af5269b73a2`
- **ECS Security Group**: Updated to allow ALB traffic

## Step-by-Step: Create ALB via Console

### Step 1: Navigate to Load Balancers
1. Go to AWS Console: https://console.aws.amazon.com/ec2/
2. In the left sidebar, click **"Load Balancers"** (under "Load Balancing")
3. Click **"Create Load Balancer"** button

### Step 2: Choose Load Balancer Type
- Select **"Application Load Balancer"**
- Click **"Create"**

### Step 3: Basic Configuration
- **Name**: `fastgraph-gateway-alb`
- **Scheme**: `Internet-facing`
- **IP address type**: `IPv4`

### Step 4: Network Mapping
- **VPC**: Select your default VPC (or the VPC where ECS is running)
- **Availability Zones**: 
  - Select at least **2 subnets** in different availability zones
  - ALB requires subnets in at least 2 AZs
  - Example: `us-east-1a` and `us-east-1b`

### Step 5: Security Groups
- **Security groups**: Select `fastgraph-gateway-alb-sg` (ID: `sg-08fc88af5269b73a2`)
- This security group already has:
  - HTTP (port 80) from 0.0.0.0/0
  - HTTPS (port 443) from 0.0.0.0/0

### Step 6: Listeners and Routing
- **Default action**: 
  - Select **"Forward to"**
  - **Target group**: Select `fastgraph-gateway-tg`
  - Click **"Create target group"** if you don't see it (but it should exist)

### Step 7: Review and Create
- Review all settings
- Click **"Create load balancer"**

### Step 8: Wait for Provisioning
- Wait 2-3 minutes for the ALB to become **"Active"**
- Note the **DNS name** (e.g., `fastgraph-gateway-alb-1234567890.us-east-1.elb.amazonaws.com`)

## Step 9: Update ECS Service

After ALB is created, update the ECS service to use it:

```bash
# Get the target group ARN
TG_ARN="arn:aws:elasticloadbalancing:us-east-1:582604091763:targetgroup/fastgraph-gateway-tg/b494c55a52fbf334"

# Get subnet IDs (replace with your actual subnet IDs)
SUBNET_IDS="subnet-xxxxx subnet-yyyyy"

# Get security group ID
SG_ID="sg-09b0a45e013710d8a"

# Update ECS service
aws ecs update-service \
  --cluster fastgraph-cluster \
  --service fastgraph-gateway-service \
  --load-balancers targetGroupArn=${TG_ARN},containerName=fastgraph-gateway,containerPort=8081 \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_ID}],assignPublicIp=DISABLED}" \
  --region us-east-1
```

## Step 10: Add HTTPS Support

After the ALB is created and active, add HTTPS listener:

```bash
cd server
./add-https-listener.sh
```

This script will:
- Find the existing ALB
- Use SSL certificate for `agentgateway.niyogen.com`
- Create HTTPS listener on port 443
- Configure SSL/TLS security policy

**Note**: If the certificate is still `PENDING_VALIDATION`, complete DNS validation first:
1. Get validation records:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:582604091763:certificate/5d64b7da-22ec-431b-9c31-9f25638daeae \
  --region us-east-1 \
  --query "Certificate.DomainValidationOptions"
```
2. Add the DNS records to your domain's DNS settings
3. Wait for validation (usually 5-10 minutes)
4. Then run `./add-https-listener.sh`

## Step 11: Test the ALB

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names fastgraph-gateway-alb \
  --region us-east-1 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

echo "ALB DNS: ${ALB_DNS}"

# Test health endpoint
curl http://${ALB_DNS}/health

# Test API feed
curl http://${ALB_DNS}/api/feed
```

## Step 11: Update Frontend Configuration

Once ALB is working, update your frontend:

1. **Update `client-next/vercel.json`** (use HTTPS):
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://YOUR-ALB-DNS-NAME",
    "BACKEND_API_URL": "https://YOUR-ALB-DNS-NAME",
    "FEED_API_URL": "https://YOUR-ALB-DNS-NAME"
  }
}
```

2. **Update `client-next/app/utils/api.ts`** (use HTTPS):
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://YOUR-ALB-DNS-NAME';
```

3. **Update Vercel environment variables** (if using Vercel, use HTTPS):
```bash
cd client-next
echo "https://YOUR-ALB-DNS-NAME" | vercel env add BACKEND_API_URL production
echo "https://YOUR-ALB-DNS-NAME" | vercel env add FEED_API_URL production
```

**Or use the domain name** (if DNS is configured):
```bash
echo "https://agentgateway.niyogen.com" | vercel env add BACKEND_API_URL production
echo "https://agentgateway.niyogen.com" | vercel env add FEED_API_URL production
```

## Troubleshooting

### ALB Health Checks Failing
- Check ECS task logs: `aws logs tail /ecs/fastgraph-gateway --follow`
- Verify health check path: `/health`
- Ensure security group allows ALB → ECS traffic on port 8081

### Tasks Not Registering
- Wait 2-3 minutes after service update
- Check target group health: AWS Console → Target Groups → fastgraph-gateway-tg → Targets tab
- Verify `assignPublicIp=DISABLED` in network configuration

### Can't Access ALB
- Check security group allows HTTP/HTTPS from your IP
- Verify ALB is in "Active" state
- Check DNS name is correct
