# EC2 Servers Information

## Found EC2 Instances

### Region: **eu-north-1** (Stockholm, Sweden)

| Instance Name | Instance ID | Public IP | Type | State | Region |
|--------------|-------------|-----------|------|-------|--------|
| **ai-rag** | i-0ba0dfae569d7a97c | 13.62.219.188 | t3.small | running | eu-north-1 |
| **britol-front** | i-03952791cc0888fab | 16.171.190.174 | t3.small | running | eu-north-1 |

## Current API Server

**Note**: Your current API at `107.23.26.219:8081` is **NOT** running on EC2. It's running on:
- **Service Type**: ECS Fargate (serverless containers)
- **Cluster**: fastgraph-cluster
- **Region**: us-east-1 (N. Virginia, USA)
- **Service**: fastgraph-gateway-service
- **Current IP**: 107.23.26.219:8081

## Region Comparison

| Service | Region | Location | Type |
|---------|--------|----------|------|
| **Current API** | us-east-1 | N. Virginia, USA | ECS Fargate |
| **ai-rag** | eu-north-1 | Stockholm, Sweden | EC2 (t3.small) |
| **britol-front** | eu-north-1 | Stockholm, Sweden | EC2 (t3.small) |

## Get More Details

To get detailed information about EC2 instances:

```bash
# Get details for ai-rag
aws ec2 describe-instances \
  --region eu-north-1 \
  --instance-ids i-0ba0dfae569d7a97c \
  --query "Reservations[0].Instances[0]"

# Get details for britol-front
aws ec2 describe-instances \
  --region eu-north-1 \
  --instance-ids i-03952791cc0888fab \
  --query "Reservations[0].Instances[0]"
```

## Check What's Running on EC2 Instances

```bash
# Check ai-rag (13.62.219.188)
curl http://13.62.219.188/health
curl http://13.62.219.188/api/feed

# Check britol-front (16.171.190.174)
curl http://16.171.190.174/health
curl http://16.171.190.174/api/feed
```

## If You Want to Use EC2 for API

If you want to move your API to one of these EC2 instances:

1. **SSH into the instance**
2. **Install and run your Go server**
3. **Update frontend to point to EC2 IP**
4. **Set up HTTPS** (using one of the methods in HTTPS_ALTERNATIVES.md)

## Quick Commands

```bash
# List all EC2 instances in eu-north-1
aws ec2 describe-instances --region eu-north-1 --output table

# Get instance details
aws ec2 describe-instances --region eu-north-1 --instance-ids i-0ba0dfae569d7a97c

# Check instance status
aws ec2 describe-instance-status --region eu-north-1 --instance-ids i-0ba0dfae569d7a97c i-03952791cc0888fab
```

