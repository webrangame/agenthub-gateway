// API configuration
// Use proxy routes in production (Vercel) to avoid mixed content issues
// Proxy routes are at /api/proxy/* and handle HTTPS -> HTTP conversion
const USE_PROXY = typeof window !== 'undefined' && window.location.protocol === 'https:';

// Updated IP: 52.204.105.193 (ECS tasks get new IPs on restart - IP changes frequently!)
// TODO: Use Application Load Balancer or Cloudflare Tunnel for stable endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://52.204.105.193:8081';
const PROXY_BASE = '/api/proxy';

export const API_ENDPOINTS = {
  feed: USE_PROXY ? `${PROXY_BASE}/feed` : `${API_BASE_URL}/api/feed`,
  chat: USE_PROXY ? `${PROXY_BASE}/chat` : `${API_BASE_URL}/api/chat/stream`,
  upload: USE_PROXY ? `${PROXY_BASE}/upload` : `${API_BASE_URL}/api/agent/upload`,
  health: `${API_BASE_URL}/health`,
};

