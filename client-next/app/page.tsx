'use client';

import React, { useState, useEffect } from 'react';
import CapabilityLayoutMapper from './CapabilityLayoutMapper';
import LoginPage from './components/LoginPage';
import { isAuthenticated } from './utils/auth';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted to true on client-side only
    setMounted(true);
    
    // Check authentication status on mount
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const authStatus = isAuthenticated();
        setAuthenticated(authStatus);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setAuthenticated(true);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('username');
    }
    setAuthenticated(false);
  };

  // Show loading only during initial mount (client-side hydration)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003580] via-[#004a9f] to-[#003580]">
        <div className="text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-center">Loading...</p>
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
      {/* Logout button - positioned at top right */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium"
        title="Logout"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Logout
      </button>
      <CapabilityLayoutMapper capabilities={activeCapabilities} />
    </div>
  );
}
