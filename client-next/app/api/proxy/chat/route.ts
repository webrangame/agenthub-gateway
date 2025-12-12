import { NextRequest } from 'next/server';

// Use environment variable for API URL, fallback to hardcoded IP
const API_BASE_URL = (process.env.BACKEND_API_URL || 'http://52.204.105.193:8081').trim();

export async function POST(request: NextRequest) {
  let timeoutId: NodeJS.Timeout | null = null;
  
  try {
    const body = await request.json();
    console.log(`[Chat Proxy] Sending request to: ${API_BASE_URL}/api/chat/stream`);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Forward the request to the backend and stream the response
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    if (timeoutId) clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[Chat Proxy] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to stream chat',
          status: response.status,
          details: errorText,
          apiUrl: API_BASE_URL
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          controller.close();
          return;
        }
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (error) {
          console.error('[Chat Proxy] Stream error:', error);
        } finally {
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering
      },
    });
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error('[Chat Proxy] Error:', error);
    
    const errorMessage = error?.message || 'Unknown error';
    const errorName = error?.name || 'Error';
    
    // Check if it's a timeout or connection error
    if (errorName === 'AbortError' || errorMessage.includes('timeout')) {
      return new Response(
        JSON.stringify({ 
          error: 'Request timeout',
          message: 'Backend API is not responding. The service may be down or unreachable.',
          type: 'TimeoutError',
          apiUrl: API_BASE_URL
        }),
        { 
          status: 504,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return new Response(
        JSON.stringify({ 
          error: 'Connection refused',
          message: 'Cannot connect to backend API. The service may be down or the IP address has changed.',
          type: 'ConnectionError',
          apiUrl: API_BASE_URL
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage,
        type: errorName,
        apiUrl: API_BASE_URL
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

