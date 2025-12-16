'use client';

import React from 'react';
import { Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import remarkBreaks from 'remark-breaks';

interface VideoCardProps {
    title: string;
    videoUrl: string;
    summary?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ title, videoUrl, summary }) => {
    return (
        <div className="bg-[#EEF5FF] border border-[#9DBEF8] rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:shadow-[#003580]/10 transition-all duration-300 group">
            {videoUrl && (
                <div className="aspect-video w-full bg-black relative">
                    <iframe
                        className="absolute inset-0 w-full h-full"
                        src={videoUrl}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )}
            <div className="p-4 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-full bg-[#003580] flex items-center justify-center">
                            <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                        </div>
                    </div>
                    <h4 className="text-sm font-bold text-[#003580] leading-snug group-hover:text-[#003580]/80 transition-colors">
                        {title}
                    </h4>
                </div>
                {summary && (
                    <div className="text-xs text-list-disc ml-4 mb-2 space-y-1 text-gray-600 leading-relaxed ml-9 relative z-10">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-bold text-[#003580]" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                li: ({ node, ...props }) => <li className="" {...props} />,
                                a: ({ node, ...props }) => <a className="underline hover:text-blue-600" target="_blank" rel="noopener noreferrer" {...props} />,
                                // Table Support
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-2 border rounded-lg border-blue-100 shadow-sm bg-white">
                                        <table className="w-full text-left border-collapse text-xs" {...props} />
                                    </div>
                                ),
                                thead: ({ node, ...props }) => <thead className="bg-blue-50/50 border-b border-blue-100" {...props} />,
                                tbody: ({ node, ...props }) => <tbody className="divide-y divide-blue-50" {...props} />,
                                tr: ({ node, ...props }) => <tr className="hover:bg-blue-50/30 transition-colors" {...props} />,
                                th: ({ node, ...props }) => <th className="px-3 py-2 font-semibold text-[#003580] whitespace-nowrap" {...props} />,
                                td: ({ node, ...props }) => <td className="px-3 py-2 align-top text-gray-700" {...props} />,
                            }}
                        >
                            {summary}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoCard;
