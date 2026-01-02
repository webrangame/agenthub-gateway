'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '../utils/cn';
import { MessageSquare, Layout } from 'lucide-react';

interface SplitLayoutProps {
    left: React.ReactNode;
    right: React.ReactNode;
    className?: string;
    collapsed?: boolean;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ left, right, className, collapsed = false }) => {
    const [leftWidth, setLeftWidth] = useState(50); // Percentage
    const [isResizing, setIsResizing] = useState(false);
    const [mobileTab, setMobileTab] = useState<'chat' | 'feed'>('chat');
    const containerRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback(() => {
        if (!collapsed) {
            setIsResizing(true);
        }
    }, [collapsed]);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing && containerRef.current && !collapsed) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newLeftWidth = ((mouseMoveEvent.clientX - containerRect.left) / containerRect.width) * 100;
            // Limit resized width between 20% and 80%
            if (newLeftWidth >= 20 && newLeftWidth <= 80) {
                setLeftWidth(newLeftWidth);
            }
        }
    }, [isResizing, collapsed]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "flex flex-col md:flex-row h-full w-full overflow-hidden bg-gray-50",
                isResizing && "select-none",
                className
            )}
        >
            {/* Mobile Tab Navigation (Visible only on small screens) */}
            <div className="md:hidden flex items-center border-b border-gray-200 bg-white shadow-sm shrink-0 sticky top-0 z-50">
                <button
                    onClick={() => setMobileTab('chat')}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                        mobileTab === 'chat'
                            ? "text-[#003580] border-b-2 border-[#003580] bg-blue-50/50"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    )}
                >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button
                    onClick={() => setMobileTab('feed')}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                        mobileTab === 'feed'
                            ? "text-[#003580] border-b-2 border-[#003580] bg-blue-50/50"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    )}
                >
                    <Layout className="w-4 h-4" />
                    Insights
                </button>
            </div>

            {/* Left Pane (Chat) */}
            <div
                className={cn(
                    "relative transition-all duration-300 ease-in-out bg-white overflow-hidden",
                    // Mobile: Show only if active tab
                    mobileTab === 'chat' ? "flex flex-1 w-full" : "hidden",
                    // Desktop: Always flex, override hidden
                    "md:flex md:flex-col md:h-full",
                    // Desktop: Width via var, or fixed if collapsed
                    collapsed ? "md:w-[60px]" : "md:w-[var(--left-width)]"
                )}
                style={{ "--left-width": `${leftWidth}%` } as React.CSSProperties}
            >
                {left}
                {isResizing && <div className="absolute inset-0 z-50 bg-transparent" />}
            </div>

            {/* Resize Handle (Hidden on Mobile) */}
            {!collapsed && (
                <div
                    className={cn(
                        "hidden md:flex w-1 hover:w-2 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex-col justify-center items-center z-20 transition-all duration-150 delay-75 group",
                        isResizing && "bg-blue-500 w-2"
                    )}
                    onMouseDown={startResizing}
                >
                    <div className={cn(
                        "h-8 w-1 rounded-full bg-gray-400/50 group-hover:bg-white/80 transition-colors",
                        isResizing && "bg-white"
                    )} />
                </div>
            )}

            {/* Right Pane (Feed) */}
            <div
                className={cn(
                    "bg-gray-50 flex-col relative min-w-0 transition-all duration-300 ease-in-out overflow-hidden",
                    // Mobile: Show only if active tab
                    mobileTab === 'feed' ? "flex flex-1 w-full" : "hidden",
                    // Desktop: Always visible
                    "md:flex md:flex-1 md:w-auto md:h-full"
                )}
            >
                {right}
                {isResizing && <div className="absolute inset-0 z-50 bg-transparent" />}
            </div>
        </div>
    );
};

export default SplitLayout;
