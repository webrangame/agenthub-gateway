'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload } from 'lucide-react';
import DragDropZone from './DragDropZone';
import { API_ENDPOINTS } from '../utils/api';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const ChatPanel: React.FC = () => {
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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            const response = await fetch(API_ENDPOINTS.chat, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input: userMsg.content }),
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

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
                                currentText += parsed.text;
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
            setMessages(prev => [...prev, {
                id: Date.now().toString() + '-done',
                role: 'assistant',
                content: "✅ Analysis complete. Check the Insight Stream for details.",
                timestamp: new Date()
            }]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#003580] z-10 sticky top-0">
                <h2 className="font-bold text-white">Trip Guardian</h2>
                <span className="text-xs px-2 py-1 bg-white/15 text-white rounded-full flex items-center gap-1 border border-white/20">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Online
                </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="mb-6">
                    <DragDropZone />
                </div>

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
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
            <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-2 bg-[#EEF5FF] border border-blue-200 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-300 transition-all shadow-sm">
                    <input
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
                        className="p-2 bg-[#003580] hover:bg-[#002a66] disabled:bg-[#003580]/40 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-gray-400">
                        AI Agent can make mistakes. Verify important travel info.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;




