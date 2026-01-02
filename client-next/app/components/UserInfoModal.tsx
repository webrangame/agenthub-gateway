'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAppSelector } from '../store/hooks';

interface UserInfoModalProps {
    onClose: () => void;
}

const UserInfoModal: React.FC<UserInfoModalProps> = ({ onClose }) => {
    const user = useAppSelector((state) => state.user.user);

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#003580] to-[#004a9f] px-6 py-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">User Information</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {user ? (
                            <>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Name</p>
                                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Email</p>
                                        <p className="text-sm font-semibold text-gray-900 break-all">{user.email}</p>
                                    </div>

                                    {user.phoneNumber && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                                            <p className="text-sm font-semibold text-gray-900">{user.phoneNumber}</p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">User ID</p>
                                        <p className="text-sm font-semibold text-gray-900">{user.id}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Created At</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>

                                    {user.billingAddress && (
                                        <div className="pt-3 border-t border-gray-200">
                                            <p className="text-xs text-gray-500 mb-2">Billing Address</p>
                                            <div className="text-sm text-gray-900 space-y-1">
                                                <p>{user.billingAddress.line1}</p>
                                                {user.billingAddress.line2 && <p>{user.billingAddress.line2}</p>}
                                                <p>
                                                    {user.billingAddress.city}
                                                    {user.billingAddress.state && `, ${user.billingAddress.state}`}
                                                    {user.billingAddress.postalCode && ` ${user.billingAddress.postalCode}`}
                                                </p>
                                                <p>{user.billingAddress.country}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-600 mb-2">No user information available</p>
                                <p className="text-sm text-gray-500">
                                    Please log in to view your information
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-[#003580] hover:bg-[#002a66] text-white rounded-lg transition-colors font-medium"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default UserInfoModal;
