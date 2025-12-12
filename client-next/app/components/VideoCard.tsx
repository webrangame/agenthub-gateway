'use client';

import React from 'react';

interface VideoCardProps {
    title: string;
    videoUrl: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ title, videoUrl }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-video w-full bg-gray-100 relative">
                <iframe
                    className="absolute inset-0 w-full h-full"
                    src={videoUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
            <div className="p-3">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{title}</h4>
            </div>
        </div>
    );
};

export default VideoCard;




