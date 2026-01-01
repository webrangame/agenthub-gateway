# How to Enable Application Load Balancer (ALB) in AWS

## Current Situation

You previously encountered this error:
```
OperationNotPermitted: This AWS account currently does not support creating load balancers
```

This means your AWS account needs the Elastic Load Balancing (ELB) service enabled.

## Solution Options

### Option 1: Enable ELB Service via AWS Support (Recommended)

**This is the most reliable way to enable ALB.**

#### Step 1: Contact AWS Support

1. Go to AWS Support Console: https://console.aws.amazon.com/support/
2. Click **"Create case"**
3. Select:
   - **Case type**: Service limit increase
   - **Service**: Elastic Load Balancing
   - **Limit type**: Application Load Balancers per region
   - **Region**: us-east-1
   - **New limit value**: 5 (or more if needed)
4. **Description**: 
   ```
   I need to enable the Elastic Load Balancing service for my AWS account. 
   Currently getting "OperationNotPermitted: This AWS account currently does not support creating load balancers" 
   when trying to create an Application Load Balancer.
   
   Please enable ELB service and allow creation of Application Load Balancers.
   ```
5. Click **"Submit"**

#### Step 2: Wait for Response

- AWS Support typically responds within 24 hours
- They may ask for additional information
- Once enabled, you can create ALBs

#### Step 3: Verify Service is Enabled

```bash
# Try to list load balancers (should work even if empty)
aws elbv2 describe-load-balancers --region us-east-1

# If this works without errors, ELB service is enabled
```

### Option 2: Check Service Quotas

Sometimes the service is enabled but quotas are set to 0:

```bash
# Check current quota
aws service-quotas get-service-quota \
  --service-code elasticloadbalancing \
  --quota-code L-53DA6B97 \
  --region us-east-1

# Request quota increase if needed
aws service-quotas request-service-quota-increase \
  --service-code elasticloadbalancing \
  --quota-code L-53DA6B97 \
  --desired-value 5 \
  --region us-east-1
```

### Option 3: Use AWS Console to Request Service Access

1. Go to: https://console.aws.amazon.com/servicequotas/
2. Navigate to **Elastic Load Balancing**
3. Look for **"Application Load Balancers per region"**
4. Click **"Request quota increase"**
5. Enter desired value (e.g., 5)
6. Submit request

### Option 4: Check IAM Permissions

Ensure your IAM user/role has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:*",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:CreateSecurityGroup"
      ],
      "Resource": "*"
    }
  ]
}
```

## Once ALB Service is Enabled

### Automated Setup (Recommended)

Run the setup script:

```bash
cd server
./setup-alb-https.sh
```

This will:
1. ✅ Create Target Group (already exists)
2. ✅ Create/Update Security Groups (already exist)
3. ✅ Create Application Load Balancer
4. ✅ Create HTTP listener (port 80)
5. ✅ Create HTTPS listener (port 443) if certificate available
6. ✅ Update ECS service to use ALB

### Manual Setup via Console

If you prefer manual setup, follow: `server/MANUAL_ALB_SETUP.md`

## Current Configuration

### Already Created ✅

- **Target Group**: `fastgraph-gateway-tg`
  - ARN: `arn:aws:elasticloadbalancing:us-east-1:582604091763:targetgroup/fastgraph-gateway-tg/b494c55a52fbf334`
  - Port: 8081
  - Health Check: `/health`

- **ALB Security Group**: `sg-08fc88af5269b73a2`
  - Allows HTTP (80) and HTTPS (443) from internet

- **ECS Security Group**: `sg-09b0a45e013710d8a`
  - Allows traffic from ALB on port 8081

### Network Configuration

- **VPC**: `vpc-07d3fbd9a2fad7114` (default VPC)
- **Subnets**: 6 subnets across all availability zones
- **ECS Service**: `fastgraph-gateway-service`
- **Container**: `fastgraph-gateway` on port 8081

## Quick Setup After Service is Enabled

### Step 1: Create ALB

```bash
cd server
./setup-alb-https.sh
```

### Step 2: Get ALB DNS

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names fastgraph-gateway-alb \
  --region us-east-1 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

echo "ALB DNS: ${ALB_DNS}"
```

### Step 3: Test

```bash
# Test health endpoint
curl http://${ALB_DNS}/health

# Test API feed
curl http://${ALB_DNS}/api/feed
```

### Step 4: Update Frontend

Update `client-next/vercel.json`:

```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://${ALB_DNS}",
    "BACKEND_API_URL": "https://${ALB_DNS}",
    "FEED_API_URL": "https://${ALB_DNS}"
  }
}
```

## Alternative: Use Cloudflare Tunnel (Free)

If you can't enable ALB, use Cloudflare Tunnel as a free alternative:

- ✅ Free
- ✅ Stable DNS endpoint
- ✅ Automatic HTTPS
- ✅ Works with dynamic IPs

See: `server/CLOUDFLARE_HTTPS_SETUP.md`

## Troubleshooting

### Error: "OperationNotPermitted"

**Cause**: ELB service not enabled for your account

**Solution**: Contact AWS Support (see Option 1 above)

### Error: "Service quota exceeded"

**Cause**: You've reached the limit of ALBs

**Solution**: Request quota increase (see Option 2 above)

### Error: "Access Denied"

**Cause**: IAM permissions missing

**Solution**: Add ELB permissions to your IAM user/role (see Option 4 above)

### ALB Created But Health Checks Failing

**Check**:
1. ECS tasks are running: `aws ecs list-tasks --cluster fastgraph-cluster`
2. Security group allows ALB → ECS traffic
3. Health check path is correct: `/health`
4. Container port matches: `8081`

**Fix**:
```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:582604091763:targetgroup/fastgraph-gateway-tg/b494c55a52fbf334 \
  --region us-east-1
```

## Cost Estimate

- **ALB**: ~$0.0225/hour = ~$16/month
- **LCU (Load Balancer Capacity Units)**: ~$0.008/LCU-hour
- **Data Transfer**: Standard AWS rates

**Estimated monthly cost**: ~$16-25/month (depending on traffic)

## Benefits of ALB

1. ✅ **Stable DNS endpoint** - Doesn't change with redeployments
2. ✅ **Health checks** - Automatic failover
3. ✅ **SSL/TLS termination** - HTTPS support
4. ✅ **Scaling** - Handles traffic spikes
5. ✅ **Integration** - Works seamlessly with ECS

## Next Steps

1. **Contact AWS Support** to enable ELB service
2. **Wait for confirmation** (usually 24 hours)
3. **Run setup script**: `./setup-alb-https.sh`
4. **Test ALB**: Verify health checks pass
5. **Update frontend**: Point to ALB DNS
6. **Set up custom domain**: Use Route 53 or Cloudflare

## Resources

- **AWS Support**: https://console.aws.amazon.com/support/
- **Service Quotas**: https://console.aws.amazon.com/servicequotas/
- **EC2 Console (Load Balancers)**: https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:
- **ECS Console**: https://console.aws.amazon.com/ecs/v2/clusters/fastgraph-cluster/services

