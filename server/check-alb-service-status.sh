#!/bin/bash

# Check if ALB/ELB service is enabled in your AWS account

set -e

AWS_REGION="us-east-1"

echo "🔍 Checking ALB/ELB Service Status"
echo "=================================="
echo ""

# Test 1: Try to list load balancers
echo "Test 1: Listing load balancers..."
if aws elbv2 describe-load-balancers --region ${AWS_REGION} > /dev/null 2>&1; then
    echo "✅ ELB service is accessible"
    LB_COUNT=$(aws elbv2 describe-load-balancers --region ${AWS_REGION} --query "length(LoadBalancers)" --output text)
    echo "   Current ALBs: ${LB_COUNT}"
else
    ERROR=$(aws elbv2 describe-load-balancers --region ${AWS_REGION} 2>&1)
    if echo "$ERROR" | grep -q "OperationNotPermitted"; then
        echo "❌ ELB service is NOT enabled"
        echo "   Error: OperationNotPermitted"
        echo ""
        echo "   Action required: Contact AWS Support to enable ELB service"
        echo "   See: server/ENABLE_ALB_GUIDE.md"
    else
        echo "⚠️  Unknown error:"
        echo "$ERROR"
    fi
    exit 1
fi

# Test 2: Check service quotas
echo ""
echo "Test 2: Checking service quotas..."
QUOTA=$(aws service-quotas get-service-quota \
    --service-code elasticloadbalancing \
    --quota-code L-53DA6B97 \
    --region ${AWS_REGION} \
    --query "Quota.{Value:Value,Adjustable:Adjustable}" \
    --output json 2>/dev/null || echo '{"Value":0,"Adjustable":false}')

QUOTA_VALUE=$(echo "$QUOTA" | jq -r '.Value // 0')
QUOTA_ADJUSTABLE=$(echo "$QUOTA" | jq -r '.Adjustable // false')

echo "   Application Load Balancers quota: ${QUOTA_VALUE}"
if [ "$QUOTA_VALUE" == "0" ]; then
    echo "   ⚠️  Quota is 0 - you may need to request an increase"
fi

if [ "$QUOTA_ADJUSTABLE" == "true" ]; then
    echo "   ✅ Quota is adjustable"
else
    echo "   ⚠️  Quota is not adjustable via API"
fi

# Test 3: Check IAM permissions
echo ""
echo "Test 3: Checking IAM permissions..."
if aws elbv2 create-load-balancer \
    --name test-alb-check \
    --subnets subnet-08045516e5615a6aa subnet-08f2ca560ce78af06 \
    --security-groups sg-08fc88af5269b73a2 \
    --region ${AWS_REGION} \
    --dry-run 2>&1 | grep -q "DryRunOperation"; then
    echo "   ✅ IAM permissions are sufficient"
elif aws elbv2 create-load-balancer \
    --name test-alb-check \
    --subnets subnet-08045516e5615a6aa subnet-08f2ca560ce78af06 \
    --security-groups sg-08fc88af5269b73a2 \
    --region ${AWS_REGION} \
    --dry-run 2>&1 | grep -q "AccessDenied"; then
    echo "   ❌ IAM permissions missing"
    echo "   Action: Add ELB permissions to your IAM user/role"
else
    echo "   ⚠️  Could not verify permissions (this is OK if service is not enabled)"
fi

# Test 4: Check existing resources
echo ""
echo "Test 4: Checking existing ALB resources..."
TG_COUNT=$(aws elbv2 describe-target-groups --region ${AWS_REGION} --query "length(TargetGroups)" --output text 2>/dev/null || echo "0")
echo "   Target Groups: ${TG_COUNT}"

if [ "$TG_COUNT" -gt 0 ]; then
    echo "   Existing target groups:"
    aws elbv2 describe-target-groups --region ${AWS_REGION} --query "TargetGroups[*].{Name:TargetGroupName,Port:Port,Protocol:Protocol}" --output table
fi

# Summary
echo ""
echo "📊 Summary:"
echo "==========="
if aws elbv2 describe-load-balancers --region ${AWS_REGION} > /dev/null 2>&1; then
    echo "✅ ELB service is ENABLED"
    echo ""
    echo "You can now:"
    echo "  1. Run: ./setup-alb-https.sh"
    echo "  2. Or create ALB manually via AWS Console"
else
    echo "❌ ELB service is NOT ENABLED"
    echo ""
    echo "Next steps:"
    echo "  1. Contact AWS Support to enable ELB service"
    echo "  2. See: server/ENABLE_ALB_GUIDE.md for detailed instructions"
    echo "  3. Or use Cloudflare Tunnel as free alternative"
fi
