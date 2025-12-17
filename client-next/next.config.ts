import type { NextConfig } from "next";

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8081'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081');

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/api/proxy/feed',
        destination: `${API_URL}/api/feed`,
      },
      {
        source: '/api/proxy/chat',
        destination: `${API_URL}/api/chat/stream`,
      },
      {
        source: '/api/proxy/upload',
        destination: `${API_URL}/api/agent/upload`,
      },
    ];
  },
};

export default nextConfig;
