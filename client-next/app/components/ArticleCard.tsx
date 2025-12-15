'use client';

import React from 'react';
import { ExternalLink, Eye, Video, Clock, Newspaper } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Force re-compile
interface ArticleCardProps {
    title: string;
    summary: string;
    source: string;
    imageUrl?: string;
    videoUrl?: string;
    url?: string;
    category?: 'Safety' | 'Weather' | 'Culture' | 'Tips' | 'Report';
    colorTheme?: 'blue' | 'red' | 'green' | 'purple' | 'default';
    timestamp?: string;
}

// Helper to format timestamp
const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString();
};

const ArticleCard: React.FC<ArticleCardProps> = ({
    title,
    summary,
    source,
    imageUrl,
    videoUrl,
    url,
    category = 'Tips',
    colorTheme = 'default',
    timestamp
}) => {

    return (
        <div className="bg-white border border-[#9DBEF8] rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#003580]/10 hover:border-[#003580]/30 transition-all duration-300 hover:-translate-y-1 group">
            {/* Hero Image or Video */}
            {videoUrl ? (
                <div className="relative h-48 w-full bg-black">
                    <iframe
                        src={videoUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={title}
                    />
                    <div className="absolute top-3 right-3 bg-[#003580]/90 backdrop-blur-sm text-white px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border border-[#9DBEF8]/30">
                        <Video className="w-3 h-3" />
                        Video
                    </div>
                </div>
            ) : imageUrl ? (
                <div className="relative h-48 w-full overflow-hidden bg-[#EEF5FF] group-hover:opacity-95 transition-opacity">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#003580]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            ) : (
                // Fallback elegant header
                <div className="h-12 w-full bg-[#EEF5FF] border-b border-[#9DBEF8]/30 flex items-center px-4">
                    <div className="flex items-center gap-2 text-[#003580]/60">
                        <Newspaper className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">News Update</span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-5">
                {/* Category Badge and Timestamp */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="bg-[#003580] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                            {category}
                        </span>
                        <span className="text-xs text-[#003580]/60 font-semibold">{source}</span>
                    </div>
                    {timestamp && (
                        <div className="flex items-center gap-1 text-xs text-[#003580]/50 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(timestamp)}</span>
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-[#003580] mb-3 leading-snug group-hover:text-[#003580]/80 transition-colors">
                    {title}
                </h3>

                {/* Summary */}
                <div className="text-sm text-[#003580]/70 leading-relaxed mb-4 overflow-hidden">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-[#003580]" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                            li: ({ node, ...props }) => <li className="" {...props} />,
                            a: ({ node, ...props }) => <a className="underline hover:text-blue-600" target="_blank" rel="noopener noreferrer" {...props} />,
                        }}
                    >
                        {summary}
                    </ReactMarkdown>
                </div>

                {/* Read More Link */}
                {url && (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#003580] hover:text-[#9DBEF8] transition-colors group/link mt-auto"
                    >
                        <span>Read Full Article</span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </a>
                )}
            </div>
        </div>
    );
};

export default ArticleCard;
