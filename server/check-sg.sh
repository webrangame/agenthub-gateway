#!/bin/bash
AWS_REGION="us-east-1"
echo "🔍 Checking Security Groups for Port 8080..."

# Find the security groups used by the ECS service (assuming 'default' or verify manually)
# This lists ALL SGs allowing port 8080 ingress
aws ec2 describe-security-groups \
    --region $AWS_REGION \
    --filters Name=ip-permission.to-port,Values=8080 Name=ip-permission.from-port,Values=8080 \
    --query "SecurityGroups[*].{ID:GroupId,Name:GroupName}" \
    --output table

echo ""
echo "If the list above is empty, you need to add an Inbound Rule:"
echo "   Type: Custom TCP"
echo "   Port Range: 8080"
echo "   Source: 0.0.0.0/0 (or your IP)"
