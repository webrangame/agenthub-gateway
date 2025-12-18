// Cookie-based SSO auth helpers for travel.niyogen.com
// Auth is hosted on market.niyogen.com and shared via cookies on .niyogen.com

const AUTH_BASE =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, '') || 'https://market.niyogen.com';

export type AuthUser = {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
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

export async function authMe(): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await parseError(res) };
    const user = (await res.json()) as AuthUser;
    // Best-effort store a display name for the UI icon
    setUsername(
      (user?.username as string) ||
        (user?.email as string) ||
        (user?.name as string) ||
        'User'
    );
    return { ok: true, user };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Network error';
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
    const data = (await res.json()) as { user?: AuthUser; [key: string]: unknown };
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

