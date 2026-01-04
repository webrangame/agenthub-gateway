'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useAuthLogoutMutation } from '../store/api/apiSlice';
import { clearUser } from '../store/slices/userSlice';
import ChangePasswordModal from './ChangePasswordModal';
import LiteLLMKeyModal from './LiteLLMKeyModal';
import UserInfoModal from './UserInfoModal';

interface UserMenuInlineProps {
    onLogout?: () => void;
}

const UserMenuInline: React.FC<UserMenuInlineProps> = ({ onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showLiteLLMKey, setShowLiteLLMKey] = useState(false);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Get user from Redux store
    const user = useAppSelector((state) => state.user.user);
    const dispatch = useAppDispatch();
    
    // RTK Query mutation for logout
    const [authLogoutMutation] = useAuthLogoutMutation();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLogout = async () => {
        setIsOpen(false);
        try {
            await authLogoutMutation().unwrap();
        } catch (error) {
            console.error('Logout error:', error);
            // Continue with logout even if API call fails
        }
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
        // Call onLogout callback which will handle redirect
        if (onLogout) {
            onLogout();
        }
    };

    const handleChangePassword = () => {
        setShowChangePassword(true);
        setIsOpen(false);
    };

    const handleShowLiteLLMKey = () => {
        setShowLiteLLMKey(true);
        setIsOpen(false);
    };

    // Get user initials for avatar
    const getInitials = () => {
        const name = user?.name || 'User';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };
    
    const handleShowUserInfo = () => {
        setShowUserInfo(true);
        setIsOpen(false);
    };

    return (
        <>
            <div className="relative" ref={menuRef}>
                {/* User Icon Button - Inline version */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-10 h-10 rounded-full bg-[#003580] hover:bg-[#002a66] text-white shadow-lg transition-all duration-200 flex items-center justify-center font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#003580] focus:ring-offset-2 border-2 border-white"
                    title={user?.name || user?.email || 'User'}
                    aria-label="User menu"
                >
                    {user ? getInitials() : (
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                    )}
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-10 right-0 z-[100] w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                        >
                            {/* User Info Header */}
                            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <p className="text-sm font-semibold text-gray-900">
                                    {user?.name || user?.email || 'User'}
                                </p>
                                {user?.email && (
                                    <p className="text-xs text-gray-600 mt-0.5 break-all">{user.email}</p>
                                )}
                                {user?.phoneNumber && (
                                    <p className="text-xs text-gray-500 mt-0.5">{user.phoneNumber}</p>
                                )}
                                {!user && (
                                    <p className="text-xs text-gray-500 mt-0.5">Signed in</p>
                                )}
                            </div>

                            {/* Menu Items */}
                            <div className="py-1">
                                <button
                                    onClick={handleShowUserInfo}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                                >
                                    <svg
                                        className="w-4 h-4 text-gray-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                        />
                                    </svg>
                                    User Information
                                </button>

                                <button
                                    onClick={handleShowLiteLLMKey}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                                >
                                    <svg
                                        className="w-4 h-4 text-gray-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                    </svg>
                                    LiteLLM API Key
                                </button>

                                <button
                                    onClick={handleChangePassword}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                                >
                                    <svg
                                        className="w-4 h-4 text-gray-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                        />
                                    </svg>
                                    Change Password
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
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
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Change Password Modal */}
            {showChangePassword && (
                <ChangePasswordModal
                    onClose={() => setShowChangePassword(false)}
                    onSuccess={() => setShowChangePassword(false)}
                />
            )}

            {/* LiteLLM Key Modal */}
            {showLiteLLMKey && (
                <LiteLLMKeyModal
                    onClose={() => setShowLiteLLMKey(false)}
                />
            )}

            {/* User Info Modal */}
            {showUserInfo && (
                <UserInfoModal
                    onClose={() => setShowUserInfo(false)}
                />
            )}
        </>
    );
};

export default UserMenuInline;
