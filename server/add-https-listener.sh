#!/bin/bash

# Script to add HTTPS listener to existing ALB
# Run this after ALB is created manually via AWS Console

set -e

AWS_REGION="us-east-1"
ALB_NAME="fastgraph-gateway-alb"
TARGET_GROUP_NAME="fastgraph-gateway-tg"
CERTIFICATE_DOMAIN="agentgateway.niyogen.com"

echo "🔒 Adding HTTPS listener to ALB..."

# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names ${ALB_NAME} \
  --region ${AWS_REGION} \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text)

if [ -z "$ALB_ARN" ] || [ "$ALB_ARN" == "None" ]; then
  echo "❌ ALB not found: ${ALB_NAME}"
  echo "   Please create the ALB first via AWS Console"
  exit 1
fi

echo "✅ Found ALB: ${ALB_ARN}"

# Get Target Group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names ${TARGET_GROUP_NAME} \
  --region ${AWS_REGION} \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)

if [ -z "$TARGET_GROUP_ARN" ] || [ "$TARGET_GROUP_ARN" == "None" ]; then
  echo "❌ Target group not found: ${TARGET_GROUP_NAME}"
  exit 1
fi

echo "✅ Found Target Group: ${TARGET_GROUP_ARN}"

# Get SSL Certificate ARN
echo "🔐 Looking for SSL certificate for ${CERTIFICATE_DOMAIN}..."
CERT_ARN=$(aws acm list-certificates \
  --region ${AWS_REGION} \
  --query "CertificateSummaryList[?DomainName=='${CERTIFICATE_DOMAIN}' || DomainName=='*.${CERTIFICATE_DOMAIN#*.}'].CertificateArn" \
  --output text | head -1)

if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
  echo "⚠️  Certificate not found for ${CERTIFICATE_DOMAIN}"
  echo "   Available certificates:"
  aws acm list-certificates --region ${AWS_REGION} --query "CertificateSummaryList[*].DomainName" --output table
  echo ""
  echo "   Please provide a valid certificate ARN or domain name"
  exit 1
fi

# Check certificate status
CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn ${CERT_ARN} \
  --region ${AWS_REGION} \
  --query "Certificate.Status" \
  --output text)

if [ "$CERT_STATUS" != "ISSUED" ]; then
  echo "⚠️  Certificate status: ${CERT_STATUS}"
  if [ "$CERT_STATUS" == "PENDING_VALIDATION" ]; then
    echo "   Certificate is pending validation. Please complete DNS validation first."
    echo "   Get validation records:"
    echo "   aws acm describe-certificate --certificate-arn ${CERT_ARN} --region ${AWS_REGION} --query 'Certificate.DomainValidationOptions'"
  fi
  exit 1
fi

echo "✅ Certificate found and validated: ${CERT_ARN}"

# Check if HTTPS listener already exists
HTTPS_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn ${ALB_ARN} \
  --region ${AWS_REGION} \
  --query "Listeners[?Port==\`443\`].ListenerArn" \
  --output text 2>/dev/null || echo "")

if [ -n "$HTTPS_LISTENER" ] && [ "$HTTPS_LISTENER" != "None" ]; then
  echo "✅ HTTPS listener already exists: ${HTTPS_LISTENER}"
  echo "   Updating certificate..."
  aws elbv2 modify-listener \
    --listener-arn ${HTTPS_LISTENER} \
    --certificates CertificateArn=${CERT_ARN} \
    --region ${AWS_REGION} > /dev/null
  echo "✅ HTTPS listener updated with certificate"
else
  echo "📡 Creating HTTPS listener (port 443)..."
  aws elbv2 create-listener \
    --load-balancer-arn ${ALB_ARN} \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=${CERT_ARN} \
    --default-actions Type=forward,TargetGroupArn=${TARGET_GROUP_ARN} \
    --ssl-policy ELBSecurityPolicy-TLS-1-2-2017-01 \
    --region ${AWS_REGION} > /dev/null
  
  echo "✅ HTTPS listener created"
fi

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ${ALB_ARN} \
  --region ${AWS_REGION} \
  --query "LoadBalancers[0].DNSName" \
  --output text)

echo ""
echo "✅ HTTPS setup complete!"
echo ""
echo "📊 Summary:"
echo "   ALB DNS: ${ALB_DNS}"
echo "   HTTP: http://${ALB_DNS}"
echo "   HTTPS: https://${ALB_DNS}"
echo "   Health: https://${ALB_DNS}/health"
echo ""
echo "🧪 Test HTTPS:"
echo "   curl https://${ALB_DNS}/health"
echo ""
echo "📝 Update frontend to use: https://${ALB_DNS}"

