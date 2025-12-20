import { NextResponse } from 'next/server';
import { API_BASE_URL } from '../../../utils/api';

// Feed endpoint configuration
// API_BASE_URL is resolved in app/utils/api.ts

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  let timeoutId: NodeJS.Timeout | null = null;
  const deviceId = request.headers.get('X-Device-ID') || '';
  const userId = request.headers.get('X-User-ID') || '';
  // Authorization might be needed too if we use it later

  try {
    console.log(`[Feed Proxy] Fetching from: ${API_BASE_URL}/api/feed (Device: ${deviceId}, User: ${userId})`);

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Next.js-Proxy/1.0',
    };
    if (deviceId) headers['X-Device-ID'] = deviceId;
    if (userId) headers['X-User-ID'] = userId;

    const response = await fetch(`${API_BASE_URL}/api/feed`, {
      method: 'GET',
      headers,
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
    const errorCause = error?.cause;

    // Check if it's a timeout or connection error
    if (errorName === 'AbortError' || errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      return NextResponse.json(
        {
          error: 'Request timeout',
          message: `Backend API is not responding. Please check if the service is running at ${API_BASE_URL}`,
          type: 'TimeoutError',
          apiUrl: API_BASE_URL
        },
        { status: 504 } // Gateway Timeout
      );
    }

    // Check for fetch errors (network issues) - this is the key fix
    if (errorMessage.includes('fetch failed') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNRESET') ||
      (errorCause && (errorCause.code === 'ECONNREFUSED' || errorCause.code === 'ENOTFOUND' || errorCause.code === 'ETIMEDOUT' || errorCause.code === 'ECONNRESET'))) {
      return NextResponse.json(
        {
          error: 'Connection failed',
          message: `Cannot connect to backend API at ${API_BASE_URL}. The service may be down or not running.`,
          type: 'ConnectionError',
          apiUrl: API_BASE_URL,
          details: errorCause?.code || errorCause?.message || errorMessage,
          troubleshooting: `Check the server status at ${API_BASE_URL}/health or view API docs at ${API_BASE_URL}/swagger/index.html`
        },
        { status: 503 } // Service Unavailable
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        type: errorName,
        apiUrl: API_BASE_URL,
        cause: errorCause?.code || errorCause?.message || undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  let timeoutId: NodeJS.Timeout | null = null;
  const deviceId = request.headers.get('X-Device-ID') || '';
  const userId = request.headers.get('X-User-ID') || '';

  try {
    console.log(`[Feed Proxy] Resetting feed (FORCED REFRESH) at: ${API_BASE_URL}/api/feed (Device: ${deviceId}, User: ${userId})`);

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (deviceId) headers['X-Device-ID'] = deviceId;
    if (userId) headers['X-User-ID'] = userId;

    const response = await fetch(`${API_BASE_URL}/api/feed`, {
      method: 'DELETE',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to reset feed' }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[Feed Proxy] Reset Success`);

    return NextResponse.json(data);
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error('[Feed Proxy] DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
