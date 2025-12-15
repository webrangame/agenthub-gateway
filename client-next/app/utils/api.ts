// API configuration
// Use proxy routes to avoid CORS and mixed content issues
// Proxy routes are at /api/proxy/* and handle HTTPS -> HTTP conversion
// For local development, always use proxy to avoid CORS issues
const USE_PROXY = typeof window !== 'undefined' && (
  window.location.protocol === 'https:' || 
  process.env.NEXT_PUBLIC_USE_PROXY === 'true' ||
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
);

// API URL: Default to the production backend server
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://107.23.26.219:8080';
const PROXY_BASE = '/api/proxy';

export const API_ENDPOINTS = {
  feed: USE_PROXY ? `${PROXY_BASE}/feed` : `${API_BASE_URL}/api/feed`,
  chat: USE_PROXY ? `${PROXY_BASE}/chat` : `${API_BASE_URL}/api/chat/stream`,
  upload: USE_PROXY ? `${PROXY_BASE}/upload` : `${API_BASE_URL}/api/agent/upload`,
  health: `${API_BASE_URL}/health`,
};

