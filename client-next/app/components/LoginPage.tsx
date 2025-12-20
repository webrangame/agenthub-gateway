'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { setUsername } from '../utils/auth';

interface LoginPageProps {
    onLogin: () => void;
}

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, '') || 'https://market.niyogen.com';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const handleRedirectToMarket = () => {
        // Get current URL to redirect back after login
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
        const redirectUrl = encodeURIComponent(currentUrl);

        // Redirect to market signin page with redirect parameter
        window.location.href = `${AUTH_BASE}/signin?redirect=${redirectUrl}`;
    };

    const handleDevLogin = () => {
        setUsername('Developer');
        // Set a mock user ID for hybrid identity testing
        if (typeof window !== 'undefined') {
            localStorage.setItem('userid', 'dev-user-123');
        }
        onLogin();
    };

    // Auto-redirect on mount (optional - you can remove this if you want user to click button)
    useEffect(() => {
        // Uncomment below to auto-redirect immediately
        // handleRedirectToMarket();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003580] via-[#004a9f] to-[#003580]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md px-6"
            >
                <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
                    {/* Logo/Header */}
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#003580] rounded-full mb-4">
                            <svg
                                className="w-8 h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-[#003580] mb-2">FastGraph Gateway</h1>
                        <p className="text-gray-600 text-sm">Sign in to access the platform</p>
                    </div>

                    {/* Redirect to Market Sign In */}
                    <div className="space-y-4">
                        <p className="text-gray-600 text-sm text-center">
                            You will be redirected to sign in on AgentHub
                        </p>
                        <button
                            type="button"
                            onClick={handleRedirectToMarket}
                            className="w-full bg-[#003580] hover:bg-[#002a66] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                            Sign In with AgentHub
                        </button>
                    </div>

                    {/* Local Dev / VIP Bypass */}
                    {(process.env.NODE_ENV === 'development' || showVip) && (
                        <div className="pt-2">
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-gray-300"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">Development</span>
                                <div className="flex-grow border-t border-gray-300"></div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDevLogin}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm shadow-sm"
                            >
                                🛠️ Local Dev Login (Bypass)
                            </button>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
                        <p>© 2025 FastGraph Gateway. All rights reserved.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;

