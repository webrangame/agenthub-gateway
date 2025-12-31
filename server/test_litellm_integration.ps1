# test_litellm_integration.ps1 - Quick test script for LiteLLM proxy integration (PowerShell)

Write-Host "🧪 Testing LiteLLM Proxy Integration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Set test environment variables
$env:USE_LITELLM_PROXY = "true"
$env:LITELLM_PROXY_URL = "https://swzissb82u.us-east-1.awsapprunner.com"
$env:LITELLM_API_KEY = "sk-sVlHTbaEQlBf-G1BnYmAcg"
$env:LITELLM_MODEL = "gemini-2.0-flash"

Write-Host "✓ Environment configured:" -ForegroundColor Green
Write-Host "  USE_LITELLM_PROXY: $env:USE_LITELLM_PROXY"
Write-Host "  LITELLM_PROXY_URL: $env:LITELLM_PROXY_URL"
Write-Host "  LITELLM_MODEL: $env:LITELLM_MODEL"
Write-Host ""

Write-Host "🔨 Running unit tests..." -ForegroundColor Yellow
go test ./pkg/llm/... -v -run TestGenerateContent

Write-Host ""
Write-Host "🚀 Starting server in test mode..." -ForegroundColor Yellow
Write-Host "Send a test chat request to verify LiteLLM integration"
Write-Host "Check dashboard at: https://swzissb82u.us-east-1.awsapprunner.com/ui/" -ForegroundColor Cyan
Write-Host ""

# Run the server (you'll need to stop it manually with Ctrl+C)
go run main.go
