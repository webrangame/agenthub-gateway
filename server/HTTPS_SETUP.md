# HTTPS Setup Guide for FastGraph Gateway

## Overview

This guide explains how to add HTTPS/SSL to your FastGraph Gateway API running on AWS Fargate. The recommended approach is using an **Application Load Balancer (ALB)** with SSL certificate from AWS Certificate Manager (ACM).

## Benefits of Using ALB

✅ **Stable DNS endpoint** - No more IP address changes  
✅ **HTTPS/SSL encryption** - Secure API communication  
✅ **Automatic health checks** - Better reliability  
✅ **Easy scaling** - Handles multiple tasks automatically  
✅ **Cost-effective** - ~$16/month for ALB + data transfer  

## Option 1: Application Load Balancer (Recommended)

### Prerequisites

1. AWS CLI configured with appropriate permissions
2. ECS service already deployed
3. (Optional) Domain name for SSL certificate

### Quick Setup

```bash
cd server
./setup-alb-https.sh
```

### Manual Setup Steps

#### Step 1: Request SSL Certificate (if you have a domain)

```bash
# Request certificate in ACM
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Get validation records
aws acm describe-certificate \
  --certificate-arn <CERT_ARN> \
  --region us-east-1 \
  --query "Certificate.DomainValidationOptions"
```

Add the DNS validation records to your domain's DNS settings.

#### Step 2: Create Target Group

```bash
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region us-east-1)

aws elbv2 create-target-group \
  --name fastgraph-gateway-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id ${VPC_ID} \
  --target-type ip \
  --health-check-path /health \
  --region us-east-1
```

#### Step 3: Create Application Load Balancer

```bash
# Get subnets (need at least 2 in different AZs)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query "Subnets[*].SubnetId" --output text --region us-east-1 | awk '{print $1" "$2}')

# Create ALB security group
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name fastgraph-gateway-alb-sg \
  --description "ALB security group" \
  --vpc-id ${VPC_ID} \
  --region us-east-1 \
  --query "GroupId" --output text)

# Allow HTTP/HTTPS
aws ec2 authorize-security-group-ingress --group-id ${ALB_SG_ID} --protocol tcp --port 80 --cidr 0.0.0.0/0 --region us-east-1
aws ec2 authorize-security-group-ingress --group-id ${ALB_SG_ID} --protocol tcp --port 443 --cidr 0.0.0.0/0 --region us-east-1

# Create ALB
aws elbv2 create-load-balancer \
  --name fastgraph-gateway-alb \
  --subnets ${SUBNET_IDS} \
  --security-groups ${ALB_SG_ID} \
  --scheme internet-facing \
  --type application \
  --region us-east-1
```

#### Step 4: Create Listeners

```bash
ALB_ARN=$(aws elbv2 describe-load-balancers --names fastgraph-gateway-alb --region us-east-1 --query "LoadBalancers[0].LoadBalancerArn" --output text)
TG_ARN=$(aws elbv2 describe-target-groups --names fastgraph-gateway-tg --region us-east-1 --query "TargetGroups[0].TargetGroupArn" --output text)

# HTTP listener
aws elbv2 create-listener \
  --load-balancer-arn ${ALB_ARN} \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=${TG_ARN} \
  --region us-east-1

# HTTPS listener (if certificate is ready)
aws elbv2 create-listener \
  --load-balancer-arn ${ALB_ARN} \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<YOUR_CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=${TG_ARN} \
  --ssl-policy ELBSecurityPolicy-TLS-1-2-2017-01 \
  --region us-east-1
```

#### Step 5: Update ECS Service

```bash
aws ecs update-service \
  --cluster fastgraph-cluster \
  --service fastgraph-gateway-service \
  --load-balancers targetGroupArn=${TG_ARN},containerName=fastgraph-gateway,containerPort=8080 \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_IDS>],securityGroups=[<SG_ID>],assignPublicIp=DISABLED}" \
  --region us-east-1
```

### Update Frontend

After ALB is set up, update your frontend API URL:

```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers --names fastgraph-gateway-alb --region us-east-1 --query "LoadBalancers[0].DNSName" --output text)

# Update Vercel
cd client-next
echo "https://${ALB_DNS}" | vercel env add BACKEND_API_URL production
```

## Option 2: Cloudflare Tunnel (Free Alternative)

If you don't want to pay for ALB (~$16/month), you can use Cloudflare Tunnel (free):

### Setup Cloudflare Tunnel

1. Sign up for Cloudflare (free)
2. Add your domain to Cloudflare
3. Install `cloudflared` on a server or use Cloudflare's managed tunnel
4. Configure tunnel to point to your ECS public IP

### Pros/Cons

**Pros:**
- ✅ Free
- ✅ Easy setup
- ✅ Automatic HTTPS
- ✅ DDoS protection

**Cons:**
- ❌ Requires Cloudflare account
- ❌ Still need to update IP when it changes (or use dynamic DNS)

## Option 3: API Gateway (For Serverless)

If you want to convert to serverless architecture:

1. Create API Gateway REST API
2. Create Lambda function or use HTTP integration
3. Configure custom domain with ACM certificate

**Note:** This requires significant architecture changes.

## Cost Comparison

| Solution | Monthly Cost | Setup Complexity |
|----------|-------------|------------------|
| ALB | ~$16 + data transfer | Medium |
| Cloudflare Tunnel | Free | Low |
| API Gateway | Pay per request | High |

## Recommended: ALB Setup

For production use, **ALB is the best choice** because:
- Stable endpoint (no IP changes)
- Native AWS integration
- Automatic SSL termination
- Built-in health checks
- Easy to scale

## Troubleshooting

### ALB Health Checks Failing

1. Check security group allows ALB → ECS traffic
2. Verify health check path: `/health`
3. Check ECS task logs: `aws logs tail /ecs/fastgraph-gateway --follow`

### Certificate Validation Issues

1. Ensure DNS records are correctly set
2. Wait 5-10 minutes for DNS propagation
3. Check certificate status: `aws acm describe-certificate --certificate-arn <ARN>`

### Tasks Not Registering with Target Group

1. Verify network configuration (subnets, security groups)
2. Check task is running: `aws ecs describe-tasks --cluster fastgraph-cluster --tasks <TASK_ARN>`
3. Ensure `assignPublicIp=DISABLED` when using ALB

## Next Steps

1. Run `./setup-alb-https.sh` to set up ALB
2. (Optional) Request SSL certificate in ACM
3. Update ECS service to use ALB
4. Update frontend API URL to ALB DNS
5. Test HTTPS endpoint

## References

- [AWS ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)
- [ACM Certificate Guide](https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html)
- [ECS Service with ALB](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)




