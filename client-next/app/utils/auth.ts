// Cookie-based SSO auth helpers for travel.niyogen.com
// Auth is hosted on market.niyogen.com and shared via cookies on .niyogen.com

const AUTH_BASE =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, '') || 'https://market.niyogen.com';

export type AuthUser = {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  litellmApiKey?: string; // LiteLLM Virtual Key from market.niyogen.com
  litellmKeyInfo?: {
    key?: string;
    tpmLimit?: number;
    rpmLimit?: number;
    spent?: number;
    keyName?: string;
  };
  [key: string]: unknown;
};

type ApiError = { message?: string; error?: string };

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as ApiError;
    return data?.message || data?.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export const getUsername = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('username');
};

export const setUsername = (username?: string | null) => {
  if (typeof window === 'undefined') return;
  if (username) localStorage.setItem('username', username);
  else localStorage.removeItem('username');
};

export const getLiteLLMApiKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('litellm_api_key');
};

export const getLiteLLMKeyInfo = (): { key?: string; tpmLimit?: number; rpmLimit?: number; spent?: number; keyName?: string } | null => {
  if (typeof window === 'undefined') return null;
  const info = localStorage.getItem('litellm_key_info');
  if (!info) return null;
  try {
    return JSON.parse(info);
  } catch {
    return null;
  }
};

export async function authMe(): Promise<{ ok: boolean; user?: AuthUser; userId?: string; error?: string }> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/auth/me`, {
      method: 'GET',
      credentials: 'include', // Critical: sends cookies in cross-origin request
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      mode: 'cors', // Explicitly enable CORS
    });

    // Log response details for debugging (always enabled for troubleshooting)
    console.log('[authMe] Response status:', res.status);
    console.log('[authMe] Response headers:', {
      'access-control-allow-credentials': res.headers.get('access-control-allow-credentials'),
      'access-control-allow-origin': res.headers.get('access-control-allow-origin'),
      'set-cookie': res.headers.get('set-cookie'),
    });

    if (!res.ok) {
      const error = await parseError(res);
      console.error('[authMe] Auth check failed:', error, 'Status:', res.status);
      console.error('[authMe] Full response:', await res.clone().text().catch(() => 'Could not read response'));
      return { ok: false, error };
    }

    const user = (await res.json()) as AuthUser;
    // Best-effort store a display name for the UI icon
    setUsername(
      (user?.username as string) ||
      (user?.email as string) ||
      (user?.name as string) ||
      'User'
    );
    // Store User ID for hybrid identity
    if (typeof window !== 'undefined' && user?.id) {
      localStorage.setItem('userid', user.id);
      console.log('[authMe] Store User ID:', user.id);
    }
    // Store LiteLLM Virtual Key if provided by market.niyogen.com
    if (typeof window !== 'undefined' && user?.litellmApiKey) {
      localStorage.setItem('litellm_api_key', user.litellmApiKey);
      console.log('[authMe] Store LiteLLM API Key');
    }
    // Store LiteLLM key info (TPM, RPM, Spent) if provided
    if (typeof window !== 'undefined' && user?.litellmKeyInfo) {
      localStorage.setItem('litellm_key_info', JSON.stringify(user.litellmKeyInfo));
      console.log('[authMe] Store LiteLLM Key Info:', user.litellmKeyInfo);
    }
    return { ok: true, user, userId: user?.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Network error';
    console.error('[authMe] Network error:', msg, e);
    // Check if it's a CORS error
    if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
      return { ok: false, error: 'CORS error: Check if market.niyogen.com allows travel.niyogen.com origin' };
    }
    return { ok: false, error: msg };
  }
}

export async function authLogin(
  username: string,
  password: string
): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return { ok: false, error: await parseError(res) };
    const data = (await res.json()) as { user?: AuthUser;[key: string]: unknown };
    // If API returns user info, store it; otherwise keep entered username
    const u = data?.user;
    setUsername((u?.username as string) || (u?.email as string) || username);
    return { ok: true, user: u };
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: msg };
  }
}

export async function authLogout(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    // Even if backend fails, clear local UI state
    setUsername(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userid');
      localStorage.removeItem('litellm_api_key');
      localStorage.removeItem('litellm_key_info');
    }
    if (!res.ok) return { ok: false, error: await parseError(res) };
    return { ok: true };
  } catch (e: unknown) {
    setUsername(null);
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: msg };
  }
}

export async function authSetPassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/auth/set-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) return { ok: false, error: await parseError(res) };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: msg };
  }
}

