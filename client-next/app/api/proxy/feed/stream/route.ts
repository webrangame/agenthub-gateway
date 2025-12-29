import { API_BASE_URL } from '../../../../utils/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || '';
  const deviceId = url.searchParams.get('deviceId') || '';

  try {
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      'User-Agent': 'Next.js-Proxy/1.0',
    };
    if (userId) headers['X-User-ID'] = userId;
    if (deviceId) headers['X-Device-ID'] = deviceId;

    const upstream = await fetch(`${API_BASE_URL}/api/feed/stream`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => 'Unknown error');
      return new Response(
        JSON.stringify({
          error: 'Failed to connect to feed stream',
          status: upstream.status,
          details: text,
          apiUrl: API_BASE_URL,
        }),
        {
          status: upstream.status || 502,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Pass-through SSE stream
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Proxy-Source': 'nextjs',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'Feed stream proxy error',
        details: err?.message || 'Unknown error',
        apiUrl: API_BASE_URL,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


