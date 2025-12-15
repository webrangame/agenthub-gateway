// API configuration
// Hybrid approach: Direct backend for chat (fastest, no timeout), API Gateway for others (HTTPS)

// API Gateway for most endpoints (HTTPS, stable)
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod';

// Direct backend connection for chat stream (fastest, no 29s timeout limit)
// This IP will change on redeployment - use update script to keep it current
const BACKEND_DIRECT_URL = process.env.NEXT_PUBLIC_BACKEND_DIRECT_URL || 'http://107.23.26.219:8081';

export const API_ENDPOINTS = {
  // Use API Gateway for these (HTTPS, stable)
  feed: `${API_GATEWAY_URL}/api/feed`,
  upload: `${API_GATEWAY_URL}/api/agent/upload`,
  health: `${API_GATEWAY_URL}/health`,
  
  // Use direct backend for chat stream (fastest, no timeout, better SSE support)
  chat: `${BACKEND_DIRECT_URL}/api/chat/stream`,
};
