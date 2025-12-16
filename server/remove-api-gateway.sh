#!/bin/bash

# Remove AWS API Gateway
# This script deletes the API Gateway that was set up

set -e

API_ID="ql3aoaj2x0"
AWS_REGION="us-east-1"

echo "🗑️  Removing AWS API Gateway"
echo "============================="
echo ""

# Check if API Gateway exists
echo "Step 1: Checking if API Gateway exists..."
API_EXISTS=$(aws apigateway get-rest-api \
    --rest-api-id ${API_ID} \
    --region ${AWS_REGION} \
    --query "id" \
    --output text 2>/dev/null || echo "")

if [ -z "$API_EXISTS" ] || [ "$API_EXISTS" == "None" ]; then
    echo "✅ API Gateway not found (may already be deleted)"
    exit 0
fi

echo "Found API Gateway: ${API_ID}"

# Delete API Gateway
echo ""
echo "Step 2: Deleting API Gateway..."
aws apigateway delete-rest-api \
    --rest-api-id ${API_ID} \
    --region ${AWS_REGION} 2>&1

if [ $? -eq 0 ]; then
    echo "✅ API Gateway deleted successfully"
else
    echo "❌ Error deleting API Gateway"
    exit 1
fi

# Verify deletion
echo ""
echo "Step 3: Verifying deletion..."
sleep 2
VERIFY=$(aws apigateway get-rest-api \
    --rest-api-id ${API_ID} \
    --region ${AWS_REGION} 2>&1 || echo "NOT_FOUND")

if echo "$VERIFY" | grep -q "NOT_FOUND\|does not exist"; then
    echo "✅ API Gateway successfully deleted"
else
    echo "⚠️  API Gateway may still exist (check manually)"
fi

echo ""
echo "📋 Summary:"
echo "==========="
echo "API Gateway ID: ${API_ID}"
echo "Status: Deleted"
echo ""
echo "✅ API Gateway removal complete!"

