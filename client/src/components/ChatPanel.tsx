import React from 'react';

import DragDropZone from './DragDropZone';

const ChatPanel: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col p-4">
            <div className="flex-0 mb-4">
                <DragDropZone />
            </div>
            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                Chat Interaction Zone
            </div>
            <div className="mt-4 h-12 border border-gray-300 rounded-md bg-gray-50 flex items-center px-4 text-gray-400">
                Input Placeholder...
            </div>
        </div>
    );
};

export default ChatPanel;
