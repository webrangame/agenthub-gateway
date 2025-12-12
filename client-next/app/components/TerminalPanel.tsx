'use client';

import React from 'react';

const TerminalPanel: React.FC = () => {
    return (
        <div className="flex-1 bg-gray-900 text-green-400 font-mono p-4 overflow-y-auto">
            <div>$ ai-guardian --status</div>
            <div>&gt; System Online</div>
            <div>&gt; Listening for Code Interpreter agents...</div>
            <div className="mt-2 text-gray-500"># Terminal Mock View</div>
        </div>
    );
};

export default TerminalPanel;




