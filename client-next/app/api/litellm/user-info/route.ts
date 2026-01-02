import { NextRequest, NextResponse } from 'next/server';

// Backend proxy to fetch LiteLLM user info
// This keeps the master key secure on the server side
const LITELLM_API_BASE = process.env.LITELLM_API_URL || 'https://swzissb82u.us-east-1.awsapprunner.com';
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY || 'sk-dcb0c8a73a664a2307b8e2f12ef90a34819204105f32f51cc8c621ebf88c7642';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Fetch user info from LiteLLM API
    const response = await fetch(`${LITELLM_API_BASE}/user/info?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'x-litellm-api-key': LITELLM_MASTER_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[LiteLLM Proxy] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to fetch user info from LiteLLM', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[LiteLLM Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
