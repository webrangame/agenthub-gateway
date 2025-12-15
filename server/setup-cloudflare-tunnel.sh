#!/bin/bash

# Cloudflare Tunnel Setup for FastGraph Gateway
# This provides FREE HTTPS and stable DNS endpoint without needing AWS ALB

set -e

AWS_REGION="us-east-1"
CLUSTER_NAME="fastgraph-cluster"
SERVICE_NAME="fastgraph-gateway-service"
DOMAIN="agentgateway.niyogen.com"

echo "🌐 Setting up Cloudflare Tunnel for HTTPS..."

# Get current ECS task public IP
echo "🔍 Getting current ECS task IP..."
TASK_ARN=$(aws ecs list-tasks \
  --cluster ${CLUSTER_NAME} \
  --service-name ${SERVICE_NAME} \
  --region ${AWS_REGION} \
  --query "taskArns[0]" \
  --output text)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
  echo "❌ No running tasks found"
  exit 1
fi

# Get ENI ID
ENI_ID=$(aws ecs describe-tasks \
  --cluster ${CLUSTER_NAME} \
  --tasks ${TASK_ARN} \
  --region ${AWS_REGION} \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" \
  --output text)

# Get Public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids ${ENI_ID} \
  --region ${AWS_REGION} \
  --query "NetworkInterfaces[0].Association.PublicIp" \
  --output text)

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ]; then
  echo "❌ Could not get public IP"
  exit 1
fi

echo "✅ Current ECS IP: ${PUBLIC_IP}:8081"

echo ""
echo "📋 Cloudflare Tunnel Setup Instructions:"
echo "========================================"
echo ""
echo "Option 1: Cloudflare Dashboard (Recommended)"
echo "----------------------------------------------"
echo "1. Go to: https://one.dash.cloudflare.com/"
echo "2. Select your account"
echo "3. Go to: Zero Trust → Networks → Tunnels"
echo "4. Click 'Create a tunnel'"
echo "5. Choose 'Cloudflared'"
echo "6. Name it: fastgraph-gateway-tunnel"
echo "7. Copy the token"
echo ""
echo "8. Configure the tunnel:"
echo "   - Public Hostname: ${DOMAIN}"
echo "   - Service: http://${PUBLIC_IP}:8081"
echo "   - Path: (leave empty)"
echo ""
echo "9. Save and deploy"
echo ""
echo "Option 2: Command Line (if cloudflared is installed)"
echo "----------------------------------------------------"
echo "1. Install cloudflared:"
echo "   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared"
echo "   chmod +x cloudflared"
echo ""
echo "2. Login to Cloudflare:"
echo "   ./cloudflared tunnel login"
echo ""
echo "3. Create tunnel:"
echo "   ./cloudflared tunnel create fastgraph-gateway-tunnel"
echo ""
echo "4. Configure tunnel:"
echo "   ./cloudflared tunnel route dns fastgraph-gateway-tunnel ${DOMAIN}"
echo ""
echo "5. Create config file: ~/.cloudflared/config.yml"
echo "   tunnel: fastgraph-gateway-tunnel"
echo "   credentials-file: ~/.cloudflared/<TUNNEL-ID>.json"
echo ""
echo "   ingress:"
echo "     - hostname: ${DOMAIN}"
echo "       service: http://${PUBLIC_IP}:8081"
echo "     - service: http_status:404"
echo ""
echo "6. Run tunnel:"
echo "   ./cloudflared tunnel run fastgraph-gateway-tunnel"
echo ""
echo "Option 3: Run in ECS Task (Advanced)"
echo "------------------------------------"
echo "You can run cloudflared as a sidecar container in your ECS task."
echo "This keeps the tunnel running even when tasks restart."
echo ""
echo "📝 Notes:"
echo "- Cloudflare Tunnel is FREE"
echo "- Provides automatic HTTPS"
echo "- Stable DNS endpoint (${DOMAIN})"
echo "- Works even when ECS IP changes (if using sidecar)"
echo "- No AWS costs"
echo ""
echo "🔗 Resources:"
echo "- Cloudflare Dashboard: https://one.dash.cloudflare.com/"
echo "- Documentation: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/"
echo ""
echo "✅ After setup, your API will be available at:"
echo "   https://${DOMAIN}/health"
echo "   https://${DOMAIN}/api/feed"
echo "   https://${DOMAIN}/api/chat/stream"
