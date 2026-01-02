'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_ENDPOINTS } from '../utils/api';
import { getDeviceId } from '../utils/device';
import { useAppSelector } from '../store/hooks';
import { useSendChatMessageMutation, useDeleteFeedMutation } from '../store/api/apiSlice';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatPanelProps {
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    userId?: string;
}

// Helper to strip raw JSON and internal artifacts from agent output
const cleanAgentOutput = (text: string) => {
    if (!text) return '';
    // Remove ```json ... ``` blocks often output by agents
    let cleaned = text.replace(/```json[\s\S]*?```/g, '');
    // Remove "GenerateReport_output:" etc prefixes if they leak
    cleaned = cleaned.replace(/GenerateReport_output:/g, '');
    // Check if the whole message is wrapped in ```markdown ... ``` and unwrap it
    const mdMatch = cleaned.match(/^```markdown\s*([\s\S]*?)\s*```$/);
    if (mdMatch) return mdMatch[1];
    return cleaned;
};

const ChatPanel: React.FC<ChatPanelProps> = ({ isCollapsed = false, onToggleCollapse, userId }) => {
    // Get user ID from Redux store (preferred) or use prop as fallback
    const user = useAppSelector((state) => state.user.user);
    const effectiveUserId = user?.id?.toString() || userId || (typeof window !== 'undefined' ? localStorage.getItem('userid') || '' : '');
    
    // RTK Query hooks
    const [sendChatMessage] = useSendChatMessageMutation();
    const [deleteFeed] = useDeleteFeedMutation();
    
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm your Trip Guardian. Share your travel plans (e.g., 'Spending 3 days in Tokyo') and I'll analyze safety, weather, and cultural tips for you.",
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-focus input when streaming ends
    useEffect(() => {
        if (!isStreaming && !isCollapsed) {
            inputRef.current?.focus();
        }
    }, [isStreaming, isCollapsed]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsStreaming(true);

        try {
            // Use RTK Query mutation for chat (returns Response object)
            const result = await sendChatMessage({ input: userMsg.content }).unwrap();
            
            if (!result || !result.body) {
                throw new Error('Invalid response from server');
            }

            // result is a Response object from RTK Query
            const response = result;

            // Create placeholder text for streaming message
            const assistantMsgId = Date.now().toString();
            setMessages(prev => [...prev, {
                id: assistantMsgId,
                role: 'assistant',
                content: '',
                timestamp: new Date()
            }]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            let buffer = '';
            let currentText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = (buffer + chunk).split('\n');
                // Keep the last partial line in buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;

                    if (line.startsWith('data:')) {
                        const dataContent = line.replace('data:', '').trim();
                        if (dataContent === '[DONE]') break; // Standard SSE done

                        try {
                            const parsed = JSON.parse(dataContent);

                            // Check for 'text' chunk (New Protocol)
                            if (parsed.text) {
                                let nodeValue = parsed.node;
                                let textValue = parsed.text;

                                // Skip metadata lines like "event: chunk\n"
                                if (textValue.trim() === 'event: chunk' || textValue.trim().startsWith('event:')) {
                                    continue;
                                }

                                // Check if text contains nested JSON (e.g., "data: {\"node\": \"ExtractCity\", \"text\": \"Sig\"}\n")
                                if (textValue.includes('data:') && textValue.includes('{')) {
                                    try {
                                        // Extract the JSON part after "data: "
                                        const dataIndex = textValue.indexOf('data:');
                                        if (dataIndex !== -1) {
                                            const jsonStart = textValue.indexOf('{', dataIndex);
                                            if (jsonStart !== -1) {
                                                // Find the matching closing brace
                                                let braceCount = 0;
                                                let jsonEnd = jsonStart;
                                                for (let i = jsonStart; i < textValue.length; i++) {
                                                    if (textValue[i] === '{') braceCount++;
                                                    if (textValue[i] === '}') braceCount--;
                                                    if (braceCount === 0) {
                                                        jsonEnd = i + 1;
                                                        break;
                                                    }
                                                }
                                                const jsonStr = textValue.substring(jsonStart, jsonEnd);
                                                const innerParsed = JSON.parse(jsonStr);
                                                if (innerParsed.node) nodeValue = innerParsed.node;
                                                if (innerParsed.text) textValue = innerParsed.text;
                                            }
                                        }
                                    } catch (innerError) {
                                        // If parsing fails, use original text
                                    }
                                }

                                // If node exists, format as heading + text
                                if (nodeValue) {
                                    const formattedContent = `**${nodeValue}**\n${textValue}`;
                                    currentText = currentText ? currentText + '\n\n' + formattedContent : formattedContent;
                                } else {
                                    currentText += textValue;
                                }

                                setMessages(prev => prev.map(msg =>
                                    msg.id === assistantMsgId ? { ...msg, content: currentText } : msg
                                ));
                            } else if (parsed.message) {
                                // Fallback to message field
                                currentText += parsed.message;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === assistantMsgId ? { ...msg, content: currentText } : msg
                                ));
                            }

                            // Check for 'output' (Done event)
                            if (parsed.output) {
                                // Final sync if needed
                            }
                        } catch (e) {
                            // verify if explicit [DONE] was embedded or ignoring parse error
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "I encountered an error connecting to the Gateway.",
                timestamp: new Date()
            }]);
        } finally {
            setIsStreaming(false);
            // Add a completion message
            // Stream complete
        }
    };

    const handleReset = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Removed confirm dialog to rule out popup blockers
        console.log('[ChatPanel] Reset clicked (no confirm), attempting DELETE request...');

        try {
            console.log(`[ChatPanel] DELETE feed`);
            // Use RTK Query mutation for delete
            await deleteFeed().unwrap();
            console.log('[ChatPanel] DELETE response status:', response.status);

            // Trigger feed refresh (dispatch custom event for FeedPanel to listen to)
            if (typeof window !== 'undefined') {
                console.log('[ChatPanel] Dispatching feedReset event');
                window.dispatchEvent(new CustomEvent('feedReset'));
            }

            setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: "Conversations cleared. Ready for a new plan! 🌍",
                timestamp: new Date()
            }]);
            setInputValue('');
        } catch (err) {
            console.error('Failed to reset:', err);
            alert('Failed to reset conversation. Check console.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Collapsed View
    if (isCollapsed) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#003580] relative items-center py-4">
                {/* Expand Button */}
                <button
                    onClick={onToggleCollapse}
                    className="p-2 mb-6 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    title="Expand Panel"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                {/* Vertical Text */}
                <div style={{ writingMode: 'vertical-rl' }} className="text-white font-bold tracking-wider uppercase text-sm rotate-180">
                    Trip Guardian
                </div>

                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mt-4">
                    <MessageSquare className="w-5 h-5 text-white/80" />
                </div>

                <div className="relative group cursor-help">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse border-2 border-[#003580]" />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Online
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#003580] z-10 sticky top-0">
                <h2 className="font-bold text-white tracking-wider">Trip Guardian</h2>
                <div className="flex items-center gap-2">
                    <div
                        role="button"
                        onClick={handleReset}
                        title="Reset Conversation"
                        className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                        <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs px-2 py-1 bg-white/15 text-white rounded-full flex items-center gap-1 border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Online
                    </span>

                    {/* Access to onToggleCollapse */}
                    {onToggleCollapse && (
                        <button
                            onClick={onToggleCollapse}
                            className="hidden md:block p-1.5 ml-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/20"
                            title="Collapse Panel"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${msg.role === 'user'
                                ? 'bg-[#9dbef8] text-[#003580] rounded-br-none'
                                : 'bg-[#E6EEF9] text-[#003580] rounded-bl-none'
                                }`}
                        >
                            <div className="text-sm leading-relaxed overflow-hidden">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                        h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2 uppercase tracking-tight text-[#003580]" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 text-[#003580]" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1 mt-2 text-[#003580]" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-[#003580]/30 pl-4 italic my-2 text-gray-600 bg-white/50 py-1 rounded-r" {...props} />,
                                        a: ({ node, ...props }) => <a className="underline hover:text-blue-500 font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                                        // Table Support
                                        table: ({ node, ...props }) => (
                                            <div className="overflow-x-auto my-3 border rounded-lg border-blue-100 shadow-sm bg-white">
                                                <table className="w-full text-left border-collapse text-xs" {...props} />
                                            </div>
                                        ),
                                        thead: ({ node, ...props }) => <thead className="bg-blue-50/50 border-b border-blue-100" {...props} />,
                                        tbody: ({ node, ...props }) => <tbody className="divide-y divide-blue-50" {...props} />,
                                        tr: ({ node, ...props }) => <tr className="hover:bg-blue-50/30 transition-colors" {...props} />,
                                        th: ({ node, ...props }) => <th className="px-3 py-2 font-semibold text-[#003580] whitespace-nowrap" {...props} />,
                                        td: ({ node, ...props }) => <td className="px-3 py-2 align-top text-gray-700" {...props} />,
                                        // Code Support
                                        code: ({ node, ...props }) => {
                                            const { className, children, ...rest } = props as any;
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isInline = !match && !String(children).includes('\n');
                                            return isInline ? (
                                                <code className="bg-white/50 px-1.5 py-0.5 rounded font-mono text-xs text-[#d63384] border border-black/5" {...rest}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <div className="bg-[#1e1e1e] p-3 rounded-lg my-3 overflow-x-auto shadow-inner border border-black/10">
                                                    <code className={`font-mono text-xs text-blue-100 ${className || ''}`} {...rest}>
                                                        {children}
                                                    </code>
                                                </div>
                                            );
                                        }
                                    }}
                                >
                                    {cleanAgentOutput(msg.content || '')}
                                </ReactMarkdown>
                            </div>
                            <span className={`text-[10px] block mt-2 opacity-70 ${msg.role === 'user' ? 'text-[#003580]/70' : 'text-gray-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                {isStreaming && (
                    <div className="flex justify-start">
                        <div className="bg-[#E6EEF9] rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-300 bg-white">
                <div className="flex items-center gap-2 border border-blue-200 rounded-xl px-4 py-2 focus-within:border-[#003580] transition-all shadow-[0_6px_18px_rgba(0,0,0,0.06)] focus-within:shadow-[0_8px_24px_rgba(0,53,128,0.18)]">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your plans..."
                        className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder:text-gray-400 text-sm h-10"
                        disabled={isStreaming}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isStreaming}
                        className="p-2 bg-[#003580] hover:bg-[#002a66] disabled:bg-[#003580] disabled:hover:bg-[#003580] disabled:text-white/60 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;




