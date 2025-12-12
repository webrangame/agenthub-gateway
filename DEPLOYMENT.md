# FastGraph Gateway - AWS Fargate Deployment Guide

This guide will help you deploy the FastGraph Gateway server to AWS Fargate and the Next.js frontend to Vercel.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed locally
- Node.js 18+ and npm
- AWS Account with permissions for:
  - ECS (Fargate)
  - ECR
  - Secrets Manager
  - CloudWatch Logs
  - VPC/Networking

## Architecture

- **Backend**: Go server running on AWS Fargate (ECS Cluster: `fastgraph-cluster`)
- **Frontend**: Next.js app hosted on Vercel
- **Agent**: `trip_guardian.m` runs automatically when chat requests come from frontend

## Step 1: Setup AWS Resources

Run the setup script to create all necessary AWS resources:

```bash
cd server
./setup-aws.sh
```

This script will:
- Create ECR repository (`fastgraph-gateway`)
- Create CloudWatch log group (`/ecs/fastgraph-gateway`)
- Create Secrets Manager secrets for API keys
- Create ECS cluster (`fastgraph-cluster`)

## Step 2: Update Task Definition

Before deploying, update `ecs-task-definition.json` with your AWS Account ID:

```bash
# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Update the task definition (replace YOUR_ACCOUNT_ID)
sed -i "s/YOUR_ACCOUNT_ID/${ACCOUNT_ID}/g" ecs-task-definition.json
```

## Step 3: Create IAM Roles

You need two IAM roles:

### 1. ECS Task Execution Role

```bash
# Create role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

### 2. ECS Task Role (for application access to AWS services)

```bash
# Create role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach S3 access policy (for agent-marketplace-agents bucket)
aws iam put-role-policy \
  --role-name ecsTaskRole \
  --policy-name S3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::agent-marketplace-agents/*",
        "arn:aws:s3:::agent-marketplace-agents"
      ]
    }]
  }'
```

## Step 4: Register Task Definition

```bash
cd server
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region us-east-1
```

## Step 5: Create ECS Service

```bash
./create-service.sh
```

This will:
- Create security group allowing port 8081
- Create ECS service in the `fastgraph-cluster`
- Configure networking (VPC, subnets)

## Step 6: Deploy Application

```bash
./deploy.sh
```

This will:
- Build Docker image
- Push to ECR
- Update ECS service with new image

## Step 7: Get Service Endpoint

After deployment, get the public IP or ALB endpoint:

```bash
# Get task IP
aws ecs list-tasks \
  --cluster fastgraph-cluster \
  --service-name fastgraph-gateway-service \
  --region us-east-1

# Get task details (replace TASK_ID)
TASK_ID=$(aws ecs list-tasks --cluster fastgraph-cluster --service-name fastgraph-gateway-service --region us-east-1 --query "taskArns[0]" --output text | cut -d/ -f3)

aws ecs describe-tasks \
  --cluster fastgraph-cluster \
  --tasks ${TASK_ID} \
  --region us-east-1 \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" \
  --output text

# Get public IP from ENI
ENI_ID=$(aws ecs describe-tasks --cluster fastgraph-cluster --tasks ${TASK_ID} --region us-east-1 --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

aws ec2 describe-network-interfaces \
  --network-interface-ids ${ENI_ID} \
  --region us-east-1 \
  --query "NetworkInterfaces[0].Association.PublicIp" \
  --output text
```

**Recommended**: Set up an Application Load Balancer (ALB) for better reliability and HTTPS support.

## Step 8: Deploy Frontend to Vercel

### Option A: Using Vercel CLI

```bash
cd client-next

# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Option B: Using GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set environment variable:
   - `NEXT_PUBLIC_API_URL` = Your ECS service endpoint (e.g., `http://YOUR_ALB_DNS:8081`)

### Update API URL

After deployment, update the API URL in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update: `NEXT_PUBLIC_API_URL` = `http://YOUR_ECS_ENDPOINT:8081`
3. Redeploy

Or update `vercel.json`:

```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "http://YOUR_ALB_DNS_NAME.us-east-1.elb.amazonaws.com"
  }
}
```

## How It Works

1. **Frontend (Vercel)**: User sends chat message
2. **Backend (Fargate)**: Receives request at `/api/chat/stream`
3. **Agent Execution**: Server runs `fastgraph run agents/trip-guardian/trip_guardian.m --input "USER_MESSAGE"`
4. **Streaming Response**: Server streams events back to frontend via SSE
5. **Feed Updates**: Agent output is also added to `/api/feed` for the Insight Stream

## Environment Variables

### Backend (ECS Task Definition)
- `OPENAI_API_KEY` - From Secrets Manager
- `GOOGLE_MAPS_KEY` - From Secrets Manager
- `AWS_ACCESS_KEY_ID` - From Secrets Manager
- `AWS_SECRET_ACCESS_KEY` - From Secrets Manager
- `AWS_REGION` - `us-east-1`
- `BUCKET_NAME` - `agent-marketplace-agents`

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

## Monitoring

### View Logs

```bash
# CloudWatch Logs
aws logs tail /ecs/fastgraph-gateway --follow --region us-east-1
```

### Check Service Status

```bash
aws ecs describe-services \
  --cluster fastgraph-cluster \
  --services fastgraph-gateway-service \
  --region us-east-1
```

## Troubleshooting

### Service won't start
- Check CloudWatch logs: `/ecs/fastgraph-gateway`
- Verify IAM roles have correct permissions
- Check security group allows inbound traffic on port 8081
- Verify secrets exist in Secrets Manager

### Can't connect from frontend
- Check CORS settings in `main.go`
- Verify security group allows traffic from Vercel IPs
- Check if service is running: `aws ecs describe-services --cluster fastgraph-cluster --services fastgraph-gateway-service`

### Agent not running
- Verify `agents/trip-guardian/trip_guardian.m` exists in Docker image
- Check fastgraph binary is executable: `chmod +x fastgraph`
- Review CloudWatch logs for agent execution errors

## Scaling

To scale the service:

```bash
aws ecs update-service \
  --cluster fastgraph-cluster \
  --service fastgraph-gateway-service \
  --desired-count 2 \
  --region us-east-1
```

## Cleanup

To remove all resources:

```bash
# Delete service
aws ecs update-service \
  --cluster fastgraph-cluster \
  --service fastgraph-gateway-service \
  --desired-count 0 \
  --region us-east-1

aws ecs delete-service \
  --cluster fastgraph-cluster \
  --service fastgraph-gateway-service \
  --region us-east-1

# Delete cluster
aws ecs delete-cluster \
  --cluster fastgraph-cluster \
  --region us-east-1

# Delete ECR repository
aws ecr delete-repository \
  --repository-name fastgraph-gateway \
  --force \
  --region us-east-1
```

## Next Steps

1. Set up Application Load Balancer for HTTPS
2. Configure Auto Scaling based on CPU/Memory
3. Set up CloudWatch Alarms for monitoring
4. Configure VPC endpoints for better security
5. Set up CI/CD pipeline for automated deployments

