'use client';

import React, { useState, useEffect } from 'react';
import CapabilityLayoutMapper from './CapabilityLayoutMapper';
import LoginPage from './components/LoginPage';
import { useGetAuthMeQuery, useAuthLogoutMutation, apiSlice } from './store/api/apiSlice';
import { useAppDispatch } from './store/hooks';
import { setUser, clearUser } from './store/slices/userSlice';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const dispatch = useAppDispatch();

  // Use RTK Query to fetch user data
  const { data: authData, isLoading: authLoading, error: authError, refetch: refetchAuth } = useGetAuthMeQuery(
    undefined,
    {
      skip: process.env.NODE_ENV === 'development', // Skip in dev mode
    }
  );

  // Handle redirect from market.niyogen.com after login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get('redirect');
      // If we have a redirect param, it means we came back from login
      // Clear it from URL and force auth refetch
      if (redirectParam) {
        console.log('[Auth] Redirect parameter detected, clearing URL and refetching auth');
        window.history.replaceState({}, '', window.location.pathname);
        // Force refetch auth after a short delay to ensure cookies are available
        setTimeout(() => {
          refetchAuth();
        }, 300);
      }
    }
  }, [refetchAuth]);

  useEffect(() => {
    // Mark auth check as complete once we have a response (success or error)
    if (!authLoading) {
      setAuthCheckComplete(true);
    }

    if (authData?.user) {
      console.log('[Auth] ✅ User authenticated:', { id: authData.user.id, email: authData.user.email });
      dispatch(setUser(authData.user));
      setAuthenticated(true);
    } else if (authError) {
      // Log detailed error information
      const errorStatus = 'error' in (authError as any) ? (authError as any).error : null;
      const errorMessage = errorStatus && typeof errorStatus === 'object' && 'error' in errorStatus
        ? String((errorStatus as any).error)
        : errorStatus && typeof errorStatus === 'object' && 'data' in errorStatus
          ? String((errorStatus as any).data)
          : 'Unknown error';

      console.error('[Auth] ❌ Error fetching user:', {
        error: authError,
        status: errorStatus,
        message: errorMessage
      });

      // If it's a CORS or network error, provide helpful message
      if (errorMessage?.includes('CORS') || errorMessage?.includes('Failed to fetch') || errorMessage?.includes('timed out')) {
        console.error('[Auth] 🔍 Troubleshooting steps:');
        console.error('[Auth] 1. Check browser console for CORS errors');
        console.error('[Auth] 2. Verify market.niyogen.com allows travel.niyogen.com origin');
        console.error('[Auth] 3. Check if cookies are set with Domain=.niyogen.com');
        console.error('[Auth] 4. Verify /api/auth/me endpoint is accessible');
      }

      dispatch(clearUser());
      setAuthenticated(false);
    }
  }, [authData, authError, authLoading, dispatch]);

  const handleLogin = () => {
    setAuthenticated(true);
  };

  const [authLogoutMutation] = useAuthLogoutMutation();

  const handleLogout = async () => {
    try {
      await authLogoutMutation().unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Reset RTK Query cache
    dispatch(apiSlice.util.resetApiState());
    // Clear Redux state
    dispatch(clearUser());
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userid');
      localStorage.removeItem('litellm_api_key');
      localStorage.removeItem('litellm_key_info');
      localStorage.removeItem('user_info');
      localStorage.removeItem('username');
      // Clear all cookies by setting them to expire
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    }
    // Set authenticated to false
    setAuthenticated(false);
    // Force page reload to clear all state and redirect to login
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }, 100);
  };

  // Show loading only if we're still checking auth (with timeout)
  const shouldShowLoading = authLoading || (process.env.NODE_ENV !== 'development' && !authCheckComplete && !authError);

  // Add timeout: if loading for more than 5 seconds, show login page
  useEffect(() => {
    if (shouldShowLoading) {
      console.log('[Auth] Waiting for auth response...', { authLoading, authCheckComplete, hasError: !!authError });
      const timeout = setTimeout(() => {
        console.warn('[Auth] Timeout waiting for auth response after 5 seconds, showing login page');
        console.warn('[Auth] This might indicate:');
        console.warn('[Auth] 1. CORS issue preventing the request from completing');
        console.warn('[Auth] 2. Network connectivity issue');
        console.warn('[Auth] 3. market.niyogen.com/api/auth/me endpoint is not responding');
        setAuthCheckComplete(true);
        setAuthenticated(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [shouldShowLoading, authLoading, authCheckComplete, authError]);

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003580] via-[#004a9f] to-[#003580]">
        <div className="text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-center">Checking session…</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Hardcoded for now, this will eventually come from the Agent File or Backend
  const activeCapabilities = ['trip-guardian'];
  const userId = authData?.user?.id?.toString();

  return (
    <div className="relative">
      <CapabilityLayoutMapper capabilities={activeCapabilities} onLogout={handleLogout} userId={userId} />
    </div>
  );
}
