'use client';

import React, { useState, useEffect } from 'react';
import CapabilityLayoutMapper from './CapabilityLayoutMapper';
import LoginPage from './components/LoginPage';
import { useGetAuthMeQuery, useAuthLogoutMutation } from './store/api/apiSlice';
import { useAppDispatch } from './store/hooks';
import { setUser, clearUser } from './store/slices/userSlice';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const dispatch = useAppDispatch();

  // Use RTK Query to fetch user data
  const { data: authData, isLoading: authLoading, error: authError } = useGetAuthMeQuery(
    undefined,
    {
      skip: process.env.NODE_ENV === 'development', // Skip in dev mode
    }
  );

  useEffect(() => {
    if (authData?.user) {
      dispatch(setUser(authData.user));
      setAuthenticated(true);
    } else if (authError) {
      console.warn("Auth failed (likely Cross-Domain 401). Falling back to Guest Mode for demo.");
      // Fallback: Use Guest Identity to prevent Login Loop in Production
      dispatch(setUser({
        id: 'guest-' + Math.random().toString(36).substr(2, 5),
        name: 'Guest Traveler',
        email: 'guest@guardian.local'
      }));
      setAuthenticated(true);
    }

    // Restore Dev Session
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const devUserId = localStorage.getItem('userid');
      if (devUserId && !authData && !authenticated) {
        dispatch(setUser({ id: devUserId, name: localStorage.getItem('username') || 'Developer', email: 'dev@local' }));
        setAuthenticated(true);
      }
    }
  }, [authData, authError, dispatch, authenticated]);

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
    dispatch(clearUser());
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userid');
      localStorage.removeItem('litellm_api_key');
      localStorage.removeItem('litellm_key_info');
      localStorage.removeItem('user_info');
      localStorage.removeItem('username');
    }
    setAuthenticated(false);
  };

  if (authLoading || (process.env.NODE_ENV !== 'development' && !authData && !authError)) {
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
