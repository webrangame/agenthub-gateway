import { NextRequest, NextResponse } from 'next/server';

// Use environment variable for API URL, fallback to hardcoded IP
const API_BASE_URL = (process.env.BACKEND_API_URL || 'http://52.204.105.193:8081').trim();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Forward the form data to the backend
    const response = await fetch(`${API_BASE_URL}/api/agent/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000), // 30 second timeout for uploads
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Upload API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to upload file', status: response.status, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Upload proxy error:', error);
    const errorMessage = error?.message || 'Unknown error';
    const errorName = error?.name || 'Error';
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        type: errorName,
        message: errorName === 'AbortError' ? 'Upload timeout - backend may be unreachable' : errorMessage
      },
      { status: 500 }
    );
  }
}

