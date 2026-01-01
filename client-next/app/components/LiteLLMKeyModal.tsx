'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLiteLLMApiKey } from '../utils/auth';
import { Copy, Check, X } from 'lucide-react';

interface LiteLLMKeyModalProps {
    onClose: () => void;
}

const LiteLLMKeyModal: React.FC<LiteLLMKeyModalProps> = ({ onClose }) => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Get LiteLLM key from localStorage
        const key = getLiteLLMApiKey();
        setApiKey(key);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleCopy = async () => {
        if (!apiKey) return;
        
        try {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const maskKey = (key: string | null) => {
        if (!key) return '';
        if (key.length <= 8) return key;
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    };

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
                        <h2 className="text-xl font-bold text-white">LiteLLM Virtual Key</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {apiKey ? (
                            <>
                                <p className="text-sm text-gray-600">
                                    Your LiteLLM Virtual Key is used for AI chat requests. Keep this key secure.
                                </p>
                                
                                {/* API Key Display */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center justify-between gap-2">
                                        <code className="text-sm font-mono text-gray-800 break-all flex-1">
                                            {apiKey}
                                        </code>
                                        <button
                                            onClick={handleCopy}
                                            className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition-colors"
                                            title="Copy to clipboard"
                                        >
                                            {copied ? (
                                                <Check className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <Copy className="w-5 h-5 text-gray-600" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {copied && (
                                    <p className="text-sm text-green-600 text-center">✓ Copied to clipboard!</p>
                                )}

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-800">
                                        <strong>Note:</strong> This key is automatically used for all AI chat requests. 
                                        It was provided by market.niyogen.com when you logged in.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-600 mb-2">No LiteLLM Virtual Key found</p>
                                <p className="text-sm text-gray-500">
                                    The key will be available after logging in through market.niyogen.com
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

export default LiteLLMKeyModal;
