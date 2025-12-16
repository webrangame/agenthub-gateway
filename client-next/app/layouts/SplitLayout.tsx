'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '../utils/cn';
import { GripVertical } from 'lucide-react';

interface SplitLayoutProps {
    left: React.ReactNode;
    right: React.ReactNode;
    className?: string;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ left, right, className }) => {
    const [leftWidth, setLeftWidth] = useState(50); // Percentage
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newLeftWidth = ((mouseMoveEvent.clientX - containerRect.left) / containerRect.width) * 100;
            // Limit resized width between 20% and 80%
            if (newLeftWidth >= 20 && newLeftWidth <= 80) {
                setLeftWidth(newLeftWidth);
            }
        }
    }, [isResizing]);

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
            className={cn("flex h-screen w-full overflow-hidden bg-gray-50 select-none", className)}
        >
            {/* Left Pane */}
            <div
                className="h-full bg-white flex flex-col relative"
                style={{ width: `${leftWidth}%` }}
            >
                {left}

                {/* Drag Overlay to prevent iframe interference during resize */}
                {isResizing && <div className="absolute inset-0 z-50 bg-transparent" />}
            </div>

            {/* Resize Handle */}
            <div
                className={cn(
                    "w-1 hover:w-2 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex flex-col justify-center items-center z-20 transition-all duration-150 delay-75 group",
                    isResizing && "bg-blue-500 w-2"
                )}
                onMouseDown={startResizing}
            >
                <div className={cn(
                    "h-8 w-1 rounded-full bg-gray-400/50 group-hover:bg-white/80 transition-colors",
                    isResizing && "bg-white"
                )} />
            </div>

            {/* Right Pane */}
            <div className="flex-1 h-full bg-gray-50 flex flex-col relative min-w-0">
                {right}
                {/* Drag Overlay to prevent iframe interference */}
                {isResizing && <div className="absolute inset-0 z-50 bg-transparent" />}
            </div>
        </div>
    );
};

export default SplitLayout;









