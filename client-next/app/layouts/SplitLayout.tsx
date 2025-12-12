'use client';

import React from 'react';
import { cn } from '../utils/cn';

interface SplitLayoutProps {
    left: React.ReactNode;
    right: React.ReactNode;
    className?: string;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({ left, right, className }) => {
    return (
        <div className={cn("flex h-screen w-full overflow-hidden bg-gray-50", className)}>
            {/* Left Pane */}
            <div className="w-1/2 h-full border-r border-gray-200 bg-white flex flex-col">
                {left}
            </div>

            {/* Right Pane */}
            <div className="w-1/2 h-full bg-gray-50 flex flex-col">
                {right}
            </div>
        </div>
    );
};

export default SplitLayout;




