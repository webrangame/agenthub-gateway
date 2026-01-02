'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLiteLLMApiKey, getLiteLLMKeyInfo } from '../utils/auth';
import { convertLiteLLMKeysToKeyInfo, LiteLLMKeyInfo } from '../utils/litellm';
import { useAppSelector } from '../store/hooks';
import { useGetLiteLLMUserInfoQuery } from '../store/api/apiSlice';
import { Copy, Check, X, Loader2 } from 'lucide-react';

interface LiteLLMKeyModalProps {
    onClose: () => void;
}

const LiteLLMKeyModal: React.FC<LiteLLMKeyModalProps> = ({ onClose }) => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [keyInfo, setKeyInfo] = useState<{ key?: string; tpmLimit?: number; rpmLimit?: number; spent?: number; keyName?: string } | null>(null);
    const [keys, setKeys] = useState<LiteLLMKeyInfo[]>([]);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get user from Redux store
    const user = useAppSelector((state) => state.user.user);
    
    // RTK Query to fetch LiteLLM user info
    const { data: litellmUserInfo, isLoading: litellmLoading, error: litellmError } = useGetLiteLLMUserInfoQuery(
        user?.id?.toString() || '',
        { skip: !user?.id }
    );

    useEffect(() => {
        setLoading(litellmLoading);
        
        // First, try to get from localStorage (from market.niyogen.com)
        const cachedKey = getLiteLLMApiKey();
        const cachedInfo = getLiteLLMKeyInfo();
        
        if (cachedKey) {
            setApiKey(cachedKey);
            setKeyInfo(cachedInfo);
        }

        // Then, process LiteLLM API response
        if (litellmUserInfo?.keys && litellmUserInfo.keys.length > 0) {
            const convertedKeys = convertLiteLLMKeysToKeyInfo(litellmUserInfo);
            setKeys(convertedKeys);
            
            // If no cached key, use the first key from LiteLLM
            if (!cachedKey && convertedKeys.length > 0) {
                setApiKey(convertedKeys[0].key || null);
                setKeyInfo(convertedKeys[0]);
                
                // Store in localStorage for future use
                if (convertedKeys[0].key) {
                    localStorage.setItem('litellm_api_key', convertedKeys[0].key);
                }
                if (convertedKeys[0]) {
                    localStorage.setItem('litellm_key_info', JSON.stringify(convertedKeys[0]));
                }
            }
        }
        
        if (litellmError) {
            console.error('[LiteLLMKeyModal] Failed to fetch keys:', litellmError);
            setError('Failed to fetch keys from LiteLLM API');
        }
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [litellmUserInfo, litellmLoading, litellmError]);

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
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">LiteLLM API Keys</h3>
                            <p className="text-sm text-gray-600">Your API keys for accessing LiteLLM services</p>
                        </div>

                        {loading ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-[#003580] mx-auto mb-4" />
                                <p className="text-gray-600">Loading API keys...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <p className="text-red-600 mb-2">{error}</p>
                                <p className="text-sm text-gray-500">
                                    Please try refreshing or contact support if the issue persists.
                                </p>
                            </div>
                        ) : (apiKey || keys.length > 0) ? (
                            <>
                                {/* Display all keys */}
                                {(keys.length > 0 ? keys : [{ key: apiKey || '', keyName: keyInfo?.keyName || 'API Key 1', ...keyInfo }]).map((key, index) => (
                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-[#003580] to-[#004a9f] rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{key.keyName || `API Key ${index + 1}`}</h4>
                                            </div>
                                        </div>

                                        {/* API Key Value */}
                                        <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
                                            <div className="flex items-center justify-between gap-2">
                                                <code className="text-xs font-mono text-gray-800 break-all flex-1">
                                                    {key.key || apiKey}
                                                </code>
                                                <button
                                                    onClick={() => {
                                                        const keyToCopy = key.key || apiKey;
                                                        if (keyToCopy) {
                                                            navigator.clipboard.writeText(keyToCopy);
                                                            setCopied(true);
                                                            setTimeout(() => setCopied(false), 2000);
                                                        }
                                                    }}
                                                    className="flex-shrink-0 p-1.5 hover:bg-gray-200 rounded transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    {copied ? (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-gray-600" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {copied && (
                                            <p className="text-xs text-green-600 text-center mb-3">✓ Copied to clipboard!</p>
                                        )}

                                        {/* Key Limits and Usage */}
                                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">TPM Limit</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {key.tpmLimit ? key.tpmLimit.toLocaleString() : '100,000'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">RPM Limit</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {key.rpmLimit || '100'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Spent</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    ${key.spent !== undefined ? key.spent.toFixed(2) : '0.00'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-800">
                                        <strong>Note:</strong> These keys are automatically used for all AI chat requests. 
                                        {keys.length > 0 ? ' Keys fetched from LiteLLM API.' : ' Key provided by market.niyogen.com when you logged in.'}
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
