#!/usr/bin/env bash
# test_litellm_integration.sh - Quick test script for LiteLLM proxy integration

echo "🧪 Testing LiteLLM Proxy Integration"
echo "======================================"
echo ""

# Set test environment variables
export USE_LITELLM_PROXY=true
export LITELLM_PROXY_URL=https://swzissb82u.us-east-1.awsapprunner.com
export LITELLM_API_KEY=sk-sVlHTbaEQlBf-G1BnYmAcg
export LITELLM_MODEL=gemini-2.0-flash

echo "✓ Environment configured:"
echo "  USE_LITELLM_PROXY: $USE_LITELLM_PROXY"
echo "  LITELLM_PROXY_URL: $LITELLM_PROXY_URL"
echo "  LITELLM_MODEL: $LITELLM_MODEL"
echo ""

echo "🔨 Running unit tests..."
go test ./pkg/llm/... -v -run TestGenerateContent

echo ""
echo "🚀 Starting server in test mode..."
echo "Send a test chat request to verify LiteLLM integration"
echo "Check dashboard at: https://swzissb82u.us-east-1.awsapprunner.com/ui/"
echo ""

# Run the server (you'll need to stop it manually with Ctrl+C)
go run main.go
