import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { User } from '../slices/userSlice';

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, '') || 'https://market.niyogen.com';
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? (process.env.BACKEND_API_URL || 'http://localhost:8081')
  : (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://3.80.195.233:8081');
const PROXY_BASE = '/api/proxy';

// Helper to get device ID (using same logic as utils/device.ts)
const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  const DEVICE_ID_KEY = 'ai_guardian_device_id';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Use uuid if available, otherwise generate simple ID
    try {
      const { v4: uuidv4 } = require('uuid');
      deviceId = uuidv4();
    } catch {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (deviceId) {
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  }
  return deviceId || '';
};

// Base query with automatic X-User-ID header injection
const baseQuery = fetchBaseQuery({
  baseUrl: '/',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const userId = state.user.user?.id;

    if (userId) {
      headers.set('X-User-ID', userId.toString());
    }

    // Get device ID
    const deviceId = getDeviceId();
    if (deviceId) {
      headers.set('X-Device-ID', deviceId);
    }

    // Get LiteLLM API key from localStorage
    if (typeof window !== 'undefined') {
      const litellmApiKey = localStorage.getItem('litellm_api_key');
      if (litellmApiKey) {
        headers.set('X-LiteLLM-API-Key', litellmApiKey);
      }
    }

    return headers;
  },
  credentials: 'include',
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Chat', 'Feed', 'LiteLLM'],
  endpoints: (builder) => ({
    // Auth endpoint - use fetch directly for CORS
    getAuthMe: builder.query<{ user: User }, void>({
      queryFn: async () => {
        try {
          console.log('[Auth] Fetching user from:', `${AUTH_BASE}/api/auth/me`);

          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(`${AUTH_BASE}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          clearTimeout(timeoutId);

          console.log('[Auth] Response status:', response.status);
          console.log('[Auth] Response headers:', {
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
            'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
          });

          if (!response.ok) {
            // 401 means not authenticated, which is expected for logged out users
            if (response.status === 401) {
              console.log('[Auth] 401 - Not authenticated (expected for logged out users)');
              return { error: { status: response.status, data: 'Not authenticated' } };
            }
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('[Auth] Non-200 response:', response.status, errorText);
            return { error: { status: response.status, data: errorText || 'Failed to fetch user' } };
          }

          const data = await response.json();
          console.log('[Auth] User data received:', { id: data?.user?.id, email: data?.user?.email });
          return { data };
        } catch (error: any) {
          // Handle abort/timeout
          if (error.name === 'AbortError') {
            console.error('[Auth] Request timed out after 10 seconds');
            return { error: { status: 'FETCH_ERROR', error: 'Request timed out' } };
          }
          // Handle CORS errors
          if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
            console.error('[Auth] CORS or network error:', error);
            console.error('[Auth] This usually means:');
            console.error('[Auth] 1. market.niyogen.com does not allow travel.niyogen.com origin');
            console.error('[Auth] 2. Cookies are not set with Domain=.niyogen.com');
            console.error('[Auth] 3. CORS headers are missing or incorrect');
            return { error: { status: 'FETCH_ERROR', error: 'CORS or network error. Please check if market.niyogen.com allows travel.niyogen.com origin.' } };
          }
          console.error('[Auth] Unexpected error:', error);
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: ['User'],
    }),

    // Auth login
    authLogin: builder.mutation<{ user?: User; ok: boolean; error?: string }, { username: string; password: string }>({
      queryFn: async ({ username, password }) => {
        try {
          const response = await fetch(`${AUTH_BASE}/api/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Login failed' }));
            return { error: { status: response.status, data: error } };
          }

          const data = await response.json();
          return { data: { ...data, ok: true } };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: ['User'],
    }),

    // Auth logout
    authLogout: builder.mutation<{ ok: boolean; error?: string }, void>({
      queryFn: async () => {
        try {
          const response = await fetch(`${AUTH_BASE}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
            },
          });

          const data = response.ok ? await response.json().catch(() => ({})) : {};
          return { data: { ok: response.ok, ...data } };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: ['User'],
    }),

    // Auth set password
    authSetPassword: builder.mutation<{ ok: boolean; error?: string }, { currentPassword: string; newPassword: string }>({
      queryFn: async ({ currentPassword, newPassword }) => {
        try {
          const response = await fetch(`${AUTH_BASE}/api/auth/set-password`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ currentPassword, newPassword }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to set password' }));
            return { error: { status: response.status, data: error } };
          }

          return { data: { ok: true } };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
    }),

    // Chat endpoint - streaming response (custom queryFn for streaming)
    sendChatMessage: builder.mutation<Response, { input: string }>({
      queryFn: async ({ input }, { getState }) => {
        try {
          const state = getState() as RootState;
          const userId = state.user.user?.id;
          const deviceId = getDeviceId();
          const litellmApiKey = typeof window !== 'undefined' ? localStorage.getItem('litellm_api_key') : null;

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Device-ID': deviceId,
          };

          if (userId) {
            headers['X-User-ID'] = userId.toString();
          }

          if (litellmApiKey) {
            headers['X-LiteLLM-API-Key'] = litellmApiKey;
          }

          const response = await fetch(`${PROXY_BASE}/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ input }),
          });

          if (!response.ok) {
            return { error: { status: response.status, data: 'Chat request failed' } };
          }

          // Return the Response object for streaming
          return { data: response };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: ['Chat', 'Feed'],
    }),

    // Feed endpoint - GET
    getFeed: builder.query<any[], string | undefined>({
      query: (userId) => ({
        url: `${PROXY_BASE}/feed`,
        method: 'GET',
      }),
      providesTags: ['Feed'],
    }),

    // Feed endpoint - DELETE
    deleteFeed: builder.mutation<{ ok: boolean }, void>({
      query: () => ({
        url: `${PROXY_BASE}/feed`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Feed'],
    }),

    // Upload endpoint - custom queryFn for FormData
    uploadFile: builder.mutation<{ success: boolean; message?: string }, FormData>({
      queryFn: async (formData, { getState }) => {
        try {
          const state = getState() as RootState;
          const userId = state.user.user?.id;
          const deviceId = getDeviceId();

          const headers: Record<string, string> = {
            'X-Device-ID': deviceId,
          };

          if (userId) {
            headers['X-User-ID'] = userId.toString();
          }

          // Don't set Content-Type for FormData - browser will set it with boundary
          const response = await fetch(`${PROXY_BASE}/upload`, {
            method: 'POST',
            headers,
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
            return { error: { status: response.status, data: errorData } };
          }

          const data = await response.json();
          return { data };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: ['Feed'],
    }),

    // LiteLLM user info
    getLiteLLMUserInfo: builder.query<any, string>({
      query: (userId) => ({
        url: `/api/litellm/user-info?user_id=${encodeURIComponent(userId)}`,
        method: 'GET',
      }),
      providesTags: ['LiteLLM'],
    }),
  }),
});

export const {
  useGetAuthMeQuery,
  useAuthLoginMutation,
  useAuthLogoutMutation,
  useAuthSetPasswordMutation,
  useSendChatMessageMutation,
  useGetFeedQuery,
  useDeleteFeedMutation,
  useUploadFileMutation,
  useGetLiteLLMUserInfoQuery,
} = apiSlice;
