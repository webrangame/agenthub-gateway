'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUsername, authLogout as logout } from '../utils/auth';
import ChangePasswordModal from './ChangePasswordModal';

interface UserMenuProps {
    onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const username = getUsername();

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

    const handleLogout = () => {
        logout();
        onLogout();
        setIsOpen(false);
    };

    const handleChangePassword = () => {
        setShowChangePassword(true);
        setIsOpen(false);
    };

    // Get user initials for avatar
    const getInitials = () => {
        if (!username) return 'U';
        return username
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <>
            <div className="relative" ref={menuRef}>
                {/* User Icon Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-[#003580] hover:bg-[#002a66] text-white shadow-lg transition-all duration-200 flex items-center justify-center font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#003580] focus:ring-offset-2"
                    title={username || 'User'}
                >
                    {username ? getInitials() : (
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
                            className="fixed top-16 right-4 z-50 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                        >
                            {/* User Info Header */}
                            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <p className="text-sm font-semibold text-gray-900">{username || 'User'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Signed in</p>
                            </div>

                            {/* Menu Items */}
                            <div className="py-1">
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
        </>
    );
};

export default UserMenu;
