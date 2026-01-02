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
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
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
  tagTypes: ['User', 'Chat'],
  endpoints: (builder) => ({
    // Auth endpoint - use fetch directly for CORS
    getAuthMe: builder.query<{ user: User }, void>({
      queryFn: async () => {
        try {
          const response = await fetch(`${AUTH_BASE}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return { error: { status: response.status, data: 'Failed to fetch user' } };
          }

          const data = await response.json();
          return { data };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: ['User'],
    }),
    
    // Chat endpoint
    sendChatMessage: builder.mutation<ReadableStream, { input: string }>({
      query: (body) => ({
        url: `${PROXY_BASE}/chat`,
        method: 'POST',
        body,
        responseHandler: (response) => response.body as ReadableStream,
      }),
      invalidatesTags: ['Chat'],
    }),
    
    // Feed endpoint
    getFeed: builder.query<any[], void>({
      query: () => ({
        url: `${PROXY_BASE}/feed`,
        method: 'GET',
      }),
      providesTags: ['Chat'],
    }),
  }),
});

export const {
  useGetAuthMeQuery,
  useSendChatMessageMutation,
  useGetFeedQuery,
} = apiSlice;
