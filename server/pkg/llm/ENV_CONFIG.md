# LiteLLM Proxy Integration - Environment Configuration

## Required Environment Variables

### LiteLLM Proxy Configuration (Primary Mode)

```bash
# Enable LiteLLM proxy routing
USE_LITELLM_PROXY=true

# LiteLLM proxy endpoint
LITELLM_PROXY_URL=https://swzissb82u.us-east-1.awsapprunner.com

# Virtual key from LiteLLM dashboard
LITELLM_API_KEY=sk-sVlHTbaEQlBf-G1BnYmAcg

# Model name (configured in LiteLLM)
LITELLM_MODEL=gemini-2.0-flash
```

### Direct Gemini API (Fallback/Testing Mode)

```bash
# Disable LiteLLM proxy to use direct API
USE_LITELLM_PROXY=false

# Google API key for direct Gemini access
GOOGLE_API_KEY=your_google_api_key_here
```

## Usage

### Production (LiteLLM Proxy - Recommended)
Add to your `.env` file:
```bash
USE_LITELLM_PROXY=true
LITELLM_PROXY_URL=https://swzissb82u.us-east-1.awsapprunner.com
LITELLM_API_KEY=sk-sVlHTbaEQlBf-G1BnYmAcg
LITELLM_MODEL=gemini-2.0-flash
GOOGLE_API_KEY=your_google_api_key_here  # Keep as backup
```

### Testing/Development (Direct API)
```bash
USE_LITELLM_PROXY=false
GOOGLE_API_KEY=your_google_api_key_here
```

## Benefits of LiteLLM Proxy

- ✅ **Usage Tracking**: All requests logged in dashboard
- ✅ **Billing Control**: $1000 budget limit prevents overages
- ✅ **Multi-Provider Support**: Easy to switch between Gemini, GPT-4, Claude
- ✅ **Rate Limiting**: Built-in protection
- ✅ **Error Handling**: Better retry logic and error messages

## Feature Flag Behavior

| `USE_LITELLM_PROXY` | Behavior |
|---------------------|----------|
| `true` (default)    | Routes through LiteLLM proxy |
| `false`             | Direct Gemini API calls |
| Not set             | Defaults to `true` |

## Cloud Deployment

### AWS Secrets Manager
```bash
aws secretsmanager create-secret --name LITELLM_PROXY_URL --secret-string "https://swzissb82u.us-east-1.awsapprunner.com"
aws secretsmanager create-secret --name LITELLM_API_KEY --secret-string "sk-sVlHTbaEQlBf-G1BnYmAcg"
aws secretsmanager create-secret --name USE_LITELLM_PROXY --secret-string "true"
```

### Google Secret Manager
```bash
echo -n "https://swzissb82u.us-east-1.awsapprunner.com" | gcloud secrets create LITELLM_PROXY_URL --data-file=-
echo -n "sk-sVlHTbaEQlBf-G1BnYmAcg" | gcloud secrets create LITELLM_API_KEY --data-file=-
echo -n "true" | gcloud secrets create USE_LITELLM_PROXY --data-file=-
```
