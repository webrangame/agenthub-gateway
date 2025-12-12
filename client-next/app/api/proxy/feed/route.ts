import { NextResponse } from 'next/server';

// Use environment variable for API URL, fallback to hardcoded IP
// Note: IP changes when ECS tasks restart - consider using ALB or Cloudflare Tunnel
const API_BASE_URL = (process.env.BACKEND_API_URL || 'http://52.204.105.193:8081').trim();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  let timeoutId: NodeJS.Timeout | null = null;
  
  try {
    console.log(`[Feed Proxy] Fetching from: ${API_BASE_URL}/api/feed`);
    
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${API_BASE_URL}/api/feed`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Next.js-Proxy/1.0',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    
    if (timeoutId) clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[Feed Proxy] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { 
          error: 'Failed to fetch feed', 
          status: response.status, 
          details: errorText,
          apiUrl: API_BASE_URL
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log(`[Feed Proxy] Success: ${data?.length || 0} items`);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'X-Proxy-Source': 'nextjs',
      },
    });
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error('[Feed Proxy] Error:', error);
    
    const errorMessage = error?.message || 'Unknown error';
    const errorName = error?.name || 'Error';
    
    // Check if it's a network error
    if (errorName === 'AbortError' || errorMessage.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Request timeout',
          message: 'Backend API is not responding. Please check if the service is running.',
          type: 'TimeoutError',
          apiUrl: API_BASE_URL
        },
        { status: 504 } // Gateway Timeout
      );
    }
    
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return NextResponse.json(
        { 
          error: 'Connection refused',
          message: 'Cannot connect to backend API. The service may be down or unreachable.',
          type: 'ConnectionError',
          apiUrl: API_BASE_URL
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        type: errorName,
        apiUrl: API_BASE_URL
      },
      { status: 500 }
    );
  }
}
