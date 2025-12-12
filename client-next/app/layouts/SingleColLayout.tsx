'use client';

import React from 'react';
import { cn } from '../utils/cn';

interface SingleColLayoutProps {
    children?: React.ReactNode;
    className?: string; // Standardize props
}

const SingleColLayout: React.FC<SingleColLayoutProps> = ({ children, className }) => {
    return (
        <div className={cn("flex flex-col h-screen w-full bg-gray-50 max-w-4xl mx-auto border-x border-gray-200", className)}>
            {/* Wrapper to center content like ChatGPT */}
            {children}
        </div>
    );
};

export default SingleColLayout;




