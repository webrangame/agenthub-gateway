'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';

interface JsonViewerProps {
    data: any;
    label?: string;
    initiallyExpanded?: boolean;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data, label = 'Raw Data', initiallyExpanded = false }) => {
    const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <div className="border border-blue-100 rounded-lg bg-blue-50/30 overflow-hidden font-mono text-xs">
            <button
                onClick={toggleExpand}
                className="w-full flex items-center justify-between p-2 hover:bg-blue-50 transition-colors text-blue-800 font-semibold"
            >
                <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 opacity-60" />
                    <span>{label}</span>
                </div>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {isExpanded && (
                <div className="p-3 bg-[#1e1e1e] text-blue-100 border-t border-blue-100 overflow-x-auto">
                    <pre className="text-[10px] leading-relaxed">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default JsonViewer;
