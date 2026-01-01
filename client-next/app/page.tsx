'use client';

import React, { useState, useEffect } from 'react';
import CapabilityLayoutMapper from './CapabilityLayoutMapper';
import LoginPage from './components/LoginPage';
import { authMe, authLogout } from './utils/auth';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      setAuthChecking(true);

      // Debug: Check if cookies are available (always enabled for troubleshooting)
      if (typeof document !== 'undefined') {
        console.log('[SSO Debug] Current domain:', window.location.hostname);
        console.log('[SSO Debug] Cookies available:', document.cookie || 'No cookies found');
        console.log('[SSO Debug] Calling authMe() to:', 'https://market.niyogen.com/api/auth/me');
      }

      // In development, skip the production auth check to avoid "Network Error" console noise.
      // We rely on the "Local Dev Login" bypass button instead.
      if (process.env.NODE_ENV === 'development') {
        console.log('[Dev] Skipping production SSO check. Use Local Dev Login.');
        setAuthChecking(false);
        return;
      }

      const res = await authMe();
      if (cancelled) return;

      console.log('[SSO Debug] Auth result:', res.ok ? '✅ Authenticated' : '❌ Not authenticated', res.error || '');

      if (res.ok && res.userId) {
        setUserId(res.userId);
      }

      setAuthenticated(res.ok);
      setAuthChecking(false);
    };

    // Initial SSO check (runs on every page load, including after redirect from market)
    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = () => {
    setAuthenticated(true);
  };

  const handleLogout = async () => {
    await authLogout();
    setAuthenticated(false);
  };

  if (authChecking) {
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

  return (
    <div className="relative">
      <CapabilityLayoutMapper capabilities={activeCapabilities} onLogout={handleLogout} userId={userId || undefined} />
    </div>
  );
}
