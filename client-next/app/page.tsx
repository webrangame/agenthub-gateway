'use client';

import React, { useState, useEffect } from 'react';
import CapabilityLayoutMapper from './CapabilityLayoutMapper';
import LoginPage from './components/LoginPage';
import { authMe, authLogout } from './utils/auth';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      setAuthChecking(true);
      const res = await authMe();
      if (cancelled) return;
      setAuthenticated(res.ok);
      setAuthChecking(false);
    };

    // Initial SSO check
    checkSession();

    // Keep travel UI in sync when user logs in/out on market in another tab
    const onFocus = () => {
      checkSession();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
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
      <CapabilityLayoutMapper capabilities={activeCapabilities} onLogout={handleLogout} />
    </div>
  );
}
