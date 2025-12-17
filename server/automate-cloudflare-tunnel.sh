#!/bin/bash

# Automated Cloudflare Tunnel Setup Script
# This script helps automate the Cloudflare Tunnel setup process

set -e

DOMAIN="agentgateway.niyogen.com"
SERVICE_IP="107.23.26.219"
SERVICE_PORT="8081"
SERVICE_URL="http://${SERVICE_IP}:${SERVICE_PORT}"
TUNNEL_NAME="fastgraph-gateway-tunnel"

echo "🌐 Cloudflare Tunnel Automated Setup"
echo "===================================="
echo ""
echo "Domain: ${DOMAIN}"
echo "Service: ${SERVICE_URL}"
echo "Tunnel Name: ${TUNNEL_NAME}"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "📥 Installing cloudflared..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
    chmod +x /tmp/cloudflared
    CLOUDFLARED="/tmp/cloudflared"
    echo "✅ cloudflared installed"
else
    CLOUDFLARED="cloudflared"
    echo "✅ cloudflared already installed"
fi

echo ""
echo "Step 1: Authentication"
echo "----------------------"
echo "You need to authenticate with Cloudflare first."
echo ""
read -p "Have you already logged in to Cloudflare? (y/n): " logged_in

if [ "$logged_in" != "y" ]; then
    echo ""
    echo "🔐 Logging in to Cloudflare..."
    echo "This will open a browser window for authentication."
    echo ""
    $CLOUDFLARED tunnel login
    echo ""
    echo "✅ Authentication complete"
else
    echo "✅ Using existing authentication"
fi

echo ""
echo "Step 2: Create Tunnel"
echo "-------------------"
echo "Creating tunnel: ${TUNNEL_NAME}"

# Check if tunnel already exists
if $CLOUDFLARED tunnel list 2>/dev/null | grep -q "${TUNNEL_NAME}"; then
    echo "✅ Tunnel already exists: ${TUNNEL_NAME}"
    TUNNEL_ID=$($CLOUDFLARED tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
    echo "   Tunnel ID: ${TUNNEL_ID}"
else
    echo "Creating new tunnel..."
    TUNNEL_OUTPUT=$($CLOUDFLARED tunnel create ${TUNNEL_NAME} 2>&1)
    TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -oP 'Created tunnel \K[^ ]+' || echo "")
    
    if [ -z "$TUNNEL_ID" ]; then
        # Try to get it from list
        TUNNEL_ID=$($CLOUDFLARED tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
    fi
    
    if [ -z "$TUNNEL_ID" ]; then
        echo "❌ Failed to create tunnel. Please create it manually via dashboard."
        exit 1
    fi
    
    echo "✅ Tunnel created: ${TUNNEL_ID}"
fi

echo ""
echo "Step 3: Configure Tunnel"
echo "-----------------------"
CONFIG_DIR="$HOME/.cloudflared"
mkdir -p "$CONFIG_DIR"

# Get credentials file path
CREDENTIALS_FILE="$CONFIG_DIR/${TUNNEL_ID}.json"
if [ ! -f "$CREDENTIALS_FILE" ]; then
    # Try to find it
    CREDENTIALS_FILE=$(find "$CONFIG_DIR" -name "*.json" | head -1)
    if [ -z "$CREDENTIALS_FILE" ]; then
        echo "⚠️  Credentials file not found. Please ensure tunnel was created correctly."
        exit 1
    fi
fi

echo "Creating config file: $CONFIG_DIR/config.yml"

cat > "$CONFIG_DIR/config.yml" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_FILE}

ingress:
  - hostname: ${DOMAIN}
    service: ${SERVICE_URL}
  - service: http_status:404
EOF

echo "✅ Config file created"
echo ""
cat "$CONFIG_DIR/config.yml"

echo ""
echo "Step 4: Route DNS"
echo "----------------"
echo "Routing DNS for ${DOMAIN}..."

# Route DNS
if $CLOUDFLARED tunnel route dns ${TUNNEL_NAME} ${DOMAIN} 2>&1; then
    echo "✅ DNS route configured"
else
    echo "⚠️  DNS routing may have failed. You may need to:"
    echo "   1. Add CNAME record manually in Cloudflare Dashboard"
    echo "   2. Or ensure domain is added to Cloudflare"
    echo ""
    echo "   CNAME record needed:"
    echo "   Name: agentgateway"
    echo "   Target: ${TUNNEL_ID}.cfargotunnel.com"
fi

echo ""
echo "Step 5: Test Service"
echo "-------------------"
echo "Testing service at ${SERVICE_URL}..."
if curl -s --max-time 5 ${SERVICE_URL}/health > /dev/null; then
    echo "✅ Service is reachable"
else
    echo "⚠️  Service health check failed. Please verify the service is running."
fi

echo ""
echo "Step 6: Run Tunnel"
echo "-----------------"
echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the tunnel, use:"
echo "  $CLOUDFLARED tunnel run ${TUNNEL_NAME}"
echo ""
echo "Or run it in the background:"
echo "  nohup $CLOUDFLARED tunnel run ${TUNNEL_NAME} > /tmp/cloudflared.log 2>&1 &"
echo ""
echo "To check tunnel status:"
echo "  $CLOUDFLARED tunnel info ${TUNNEL_NAME}"
echo ""
echo "📝 After starting the tunnel, test HTTPS:"
echo "  curl https://${DOMAIN}/health"
echo ""
read -p "Do you want to start the tunnel now? (y/n): " start_now

if [ "$start_now" == "y" ]; then
    echo ""
    echo "🚀 Starting tunnel..."
    echo "Press Ctrl+C to stop"
    echo ""
    $CLOUDFLARED tunnel run ${TUNNEL_NAME}
fi

