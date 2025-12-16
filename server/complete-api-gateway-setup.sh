#!/bin/bash

# Complete API Gateway Setup with Custom Domain and HTTPS

set -e

API_ID="ql3aoaj2x0"
DOMAIN_NAME="agentgateway.niyogen.com"
CERT_ARN="arn:aws:acm:us-east-1:582604091763:certificate/5d64b7da-22ec-431b-9c31-9f25638daeae"
AWS_REGION="us-east-1"

echo "🔧 Completing API Gateway Setup..."
echo "=================================="
echo ""

# Check certificate status
echo "Step 1: Checking SSL certificate..."
CERT_STATUS=$(aws acm describe-certificate \
    --certificate-arn ${CERT_ARN} \
    --region ${AWS_REGION} \
    --query "Certificate.Status" \
    --output text)

echo "Certificate Status: ${CERT_STATUS}"

if [ "$CERT_STATUS" != "ISSUED" ]; then
    echo "⚠️  Certificate is not issued yet (Status: ${CERT_STATUS})"
    echo "   Please complete DNS validation first"
    echo ""
    echo "   Get validation records:"
    echo "   aws acm describe-certificate --certificate-arn ${CERT_ARN} --region ${AWS_REGION} --query 'Certificate.DomainValidationOptions'"
    echo ""
    read -p "Continue anyway? (y/n): " continue_anyway
    if [ "$continue_anyway" != "y" ]; then
        exit 1
    fi
fi

# Create or get custom domain
echo ""
echo "Step 2: Setting up custom domain..."
DOMAIN_EXISTS=$(aws apigateway get-domain-names \
    --region ${AWS_REGION} \
    --query "items[?domainName=='${DOMAIN_NAME}'].domainName" \
    --output text 2>/dev/null || echo "")

if [ -z "$DOMAIN_EXISTS" ] || [ "$DOMAIN_EXISTS" == "None" ]; then
    echo "Creating custom domain..."
    DOMAIN_OUTPUT=$(aws apigateway create-domain-name \
        --domain-name ${DOMAIN_NAME} \
        --regional-certificate-arn ${CERT_ARN} \
        --endpoint-configuration types=REGIONAL \
        --region ${AWS_REGION} 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Custom domain created"
        TARGET_DOMAIN=$(echo "$DOMAIN_OUTPUT" | jq -r '.regionalDomainName' 2>/dev/null || echo "")
    else
        echo "❌ Failed to create custom domain"
        echo "$DOMAIN_OUTPUT"
        exit 1
    fi
else
    echo "✅ Custom domain already exists"
    TARGET_DOMAIN=$(aws apigateway get-domain-name \
        --domain-name ${DOMAIN_NAME} \
        --region ${AWS_REGION} \
        --query "regionalDomainName" \
        --output text 2>/dev/null || echo "")
fi

if [ -n "$TARGET_DOMAIN" ]; then
    echo "Target Domain: ${TARGET_DOMAIN}"
else
    echo "⚠️  Could not get target domain. Please check manually."
fi

# Create base path mapping
echo ""
echo "Step 3: Creating base path mapping..."
aws apigateway create-base-path-mapping \
    --domain-name ${DOMAIN_NAME} \
    --rest-api-id ${API_ID} \
    --stage prod \
    --region ${AWS_REGION} 2>&1 || echo "Base path mapping may already exist"

echo "✅ Base path mapping created"

echo ""
echo "✅ API Gateway Setup Complete!"
echo ""
echo "📊 Summary:"
echo "   API ID: ${API_ID}"
echo "   Invoke URL: https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod"
echo "   Custom Domain: ${DOMAIN_NAME}"
if [ -n "$TARGET_DOMAIN" ]; then
    echo "   Target Domain: ${TARGET_DOMAIN}"
fi
echo ""
echo "📝 DNS Configuration:"
echo "   Add CNAME record:"
echo "   Name: agentgateway"
echo "   Value: ${TARGET_DOMAIN}"
echo ""
echo "🧪 Test Commands:"
echo "   # Test invoke URL"
echo "   curl https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod/health"
echo ""
echo "   # Test custom domain (after DNS update)"
echo "   curl https://${DOMAIN_NAME}/health"
echo ""

