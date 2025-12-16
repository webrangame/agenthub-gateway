#!/bin/bash

# Manual Cloudflare Tunnel Setup - Non-interactive version
# This creates the config file and provides commands to run

set -e

DOMAIN="agentgateway.niyogen.com"
SERVICE_IP="107.23.26.219"
SERVICE_PORT="8081"
SERVICE_URL="http://${SERVICE_IP}:${SERVICE_PORT}"
TUNNEL_NAME="fastgraph-gateway-tunnel"
CLOUDFLARED="/tmp/cloudflared"

echo "🌐 Cloudflare Tunnel Setup"
echo "=========================="
echo ""
echo "Domain: ${DOMAIN}"
echo "Service: ${SERVICE_URL}"
echo ""

# Check if cloudflared is available
if [ ! -f "$CLOUDFLARED" ]; then
    echo "📥 Downloading cloudflared..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
    chmod +x /tmp/cloudflared
fi

echo "✅ cloudflared ready: $CLOUDFLARED"
echo ""

echo "📋 Manual Setup Steps:"
echo "======================"
echo ""
echo "Step 1: Authenticate with Cloudflare"
echo "-------------------------------------"
echo "Run this command (it will open a browser):"
echo "  $CLOUDFLARED tunnel login"
echo ""

echo "Step 2: Create Tunnel"
echo "---------------------"
echo "Run this command:"
echo "  $CLOUDFLARED tunnel create ${TUNNEL_NAME}"
echo ""
echo "Note the Tunnel ID that is displayed"
echo ""

echo "Step 3: Get Tunnel ID"
echo "---------------------"
echo "After creating the tunnel, run:"
echo "  $CLOUDFLARED tunnel list"
echo ""
echo "Copy the Tunnel ID for ${TUNNEL_NAME}"
echo ""

read -p "Enter the Tunnel ID (or press Enter to skip): " TUNNEL_ID

if [ -n "$TUNNEL_ID" ]; then
    echo ""
    echo "Step 4: Create Config File"
    echo "-------------------------"
    CONFIG_DIR="$HOME/.cloudflared"
    mkdir -p "$CONFIG_DIR"
    
    CREDENTIALS_FILE="$CONFIG_DIR/${TUNNEL_ID}.json"
    
    # Check if credentials file exists
    if [ ! -f "$CREDENTIALS_FILE" ]; then
        CREDENTIALS_FILE=$(find "$CONFIG_DIR" -name "*.json" | head -1)
    fi
    
    if [ -z "$CREDENTIALS_FILE" ] || [ ! -f "$CREDENTIALS_FILE" ]; then
        echo "⚠️  Credentials file not found at: $CREDENTIALS_FILE"
        echo "   It should be created automatically after 'tunnel login'"
        echo "   Expected location: $CONFIG_DIR/${TUNNEL_ID}.json"
        CREDENTIALS_FILE="$CONFIG_DIR/${TUNNEL_ID}.json"
    fi
    
    cat > "$CONFIG_DIR/config.yml" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_FILE}

ingress:
  - hostname: ${DOMAIN}
    service: ${SERVICE_URL}
  - service: http_status:404
EOF
    
    echo "✅ Config file created: $CONFIG_DIR/config.yml"
    echo ""
    cat "$CONFIG_DIR/config.yml"
    echo ""
    
    echo "Step 5: Route DNS"
    echo "----------------"
    echo "Run this command:"
    echo "  $CLOUDFLARED tunnel route dns ${TUNNEL_NAME} ${DOMAIN}"
    echo ""
    
    echo "Step 6: Run Tunnel"
    echo "-----------------"
    echo "Run this command to start the tunnel:"
    echo "  $CLOUDFLARED tunnel run ${TUNNEL_NAME}"
    echo ""
    echo "Or run in background:"
    echo "  nohup $CLOUDFLARED tunnel run ${TUNNEL_NAME} > /tmp/cloudflared.log 2>&1 &"
    echo ""
else
    echo ""
    echo "⚠️  Skipping config file creation. Please run these commands manually:"
    echo ""
    echo "1. Authenticate: $CLOUDFLARED tunnel login"
    echo "2. Create tunnel: $CLOUDFLARED tunnel create ${TUNNEL_NAME}"
    echo "3. Get tunnel ID: $CLOUDFLARED tunnel list"
    echo "4. Create config file manually (see CLOUDFLARE_DASHBOARD_SETUP.md)"
    echo "5. Route DNS: $CLOUDFLARED tunnel route dns ${TUNNEL_NAME} ${DOMAIN}"
    echo "6. Run tunnel: $CLOUDFLARED tunnel run ${TUNNEL_NAME}"
    echo ""
fi

echo "Step 7: Test HTTPS"
echo "------------------"
echo "After tunnel is running, test:"
echo "  curl https://${DOMAIN}/health"
echo "  curl https://${DOMAIN}/api/feed"
echo ""

