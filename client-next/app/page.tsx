'use client';

import React, { useState, useEffect } from 'react';
import CapabilityLayoutMapper from './CapabilityLayoutMapper';
import LoginPage from './components/LoginPage';
import { useGetAuthMeQuery, useAuthLogoutMutation, apiSlice } from './store/api/apiSlice';
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
      dispatch(clearUser());
      setAuthenticated(false);
    }
  }, [authData, authError, dispatch]);

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
