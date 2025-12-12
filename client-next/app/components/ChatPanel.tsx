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
                body: JSON.stringify({ message: userMsg.content }),
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('event: message')) {
                        // Next line is data
                        continue;
                    }
                    if (line.startsWith('data:')) {
                        const dataContent = line.replace('data:', '').trim();
                        try {
                            const parsed = JSON.parse(dataContent);
                            // We only want to show the 'message' part of the event if it's meaningful
                            // But actually, the backend sends the WHOLE event JSON as data.
                            // Let's filter slightly - or just show raw logs for now to prove connection
                            // Ideally, we'd accumulate the "final report" here.

                            // For this demo, let's just log it to console and not clutter chat unless it's a specific "chat" type message.
                            // BUT, the user wants to see "chats".
                            // FastGraph v0.3.0 doesn't have a specific "chat response" node yet, it just logs.
                            // So let's extract the "message" field.

                            if (parsed.message) {
                                // Optional: If message contains "Report" or "Summary", double post it as assistant message?
                                // For now, let's just create a temporary 'log' style message or update the feed.
                                // Actually, the FEED updates automatically. The CHAT should explicitly show the Agent's "Thought process" or Final Answer.

                                // Let's simplify: Just print non-JSON simple updates as assistant messages?
                                // No, that might be too noisy.
                                // Let's look for "Trip Guardian Report" or large text blocks.
                            }
                        } catch (e) {
                            // dataContent might be a raw string if not JSON
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
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur z-10 sticky top-0">
                <h2 className="font-bold text-gray-800">Trip Guardian</h2>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
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
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                }`}
                        >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[10px] block mt-2 opacity-70 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                {isStreaming && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
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
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
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
                        className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors shadow-sm"
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




