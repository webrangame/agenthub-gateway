import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface VideoCardProps {
    title: string;
    videoUrl?: string;
    summary?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ title, videoUrl, summary }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Extract a better title from the first line if available
    const displayTitle = summary?.split('\n')[0]?.substring(0, 100) || title;
    const isLongContent = (summary?.length || 0) > 500;
    const displaySummary = isExpanded || !isLongContent
        ? summary
        : summary?.substring(0, 500) + '...';

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
            {videoUrl && (
                <div className="aspect-video w-full bg-gray-100 relative">
                    <iframe
                        className="absolute inset-0 w-full h-full"
                        src={videoUrl}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )}
            <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-bold text-gray-900 flex-1">{title}</h4>
                </div>
                {summary && (
                    <>
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{displaySummary}</ReactMarkdown>
                        </div>
                        {isLongContent && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                {isExpanded ? (
                                    <>
                                        <ChevronUp className="w-4 h-4" />
                                        Show less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4" />
                                        Read more
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default VideoCard;
