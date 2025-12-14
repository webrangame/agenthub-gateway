'use client';

import React from 'react';
import { Play } from 'lucide-react';

interface VideoCardProps {
    title: string;
    videoUrl: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ title, videoUrl }) => {
    return (
        <div className="bg-[#EEF5FF] border border-[#9DBEF8] rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:shadow-[#003580]/10 transition-all duration-300 group">
            <div className="aspect-video w-full bg-black relative">
                <iframe
                    className="absolute inset-0 w-full h-full"
                    src={videoUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
            <div className="p-4 flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-[#003580] flex items-center justify-center">
                        <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                    </div>
                </div>
                <h4 className="text-sm font-bold text-[#003580] leading-snug group-hover:text-[#003580]/80 transition-colors">
                    {title}
                </h4>
            </div>
        </div>
    );
};

export default VideoCard;
