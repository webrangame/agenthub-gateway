'use client';

import React from 'react';
import { ExternalLink, Eye, Video, Clock } from 'lucide-react';

interface ArticleCardProps {
    title: string;
    summary: string;
    source: string;
    imageUrl?: string;
    videoUrl?: string;
    url?: string;
    category?: 'Safety' | 'Weather' | 'Culture' | 'Tips' | 'Report';
    colorTheme?: 'blue' | 'red' | 'green' | 'purple' | 'default';
    timestamp?: string; // ISO 8601 timestamp
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
    timestamp // <-- Added missing destructuring
}) => {
    // Map color themes to gradient classes
    const gradientClasses = {
        blue: 'gradient-weather',
        red: 'gradient-alert-danger',
        green: 'gradient-safety',
        purple: 'gradient-culture',
        default: 'gradient-default'
    };

    const categoryColors = {
        Safety: 'bg-red-500',
        Weather: 'bg-blue-500',
        Culture: 'bg-purple-500',
        Tips: 'bg-cyan-500',
        Report: 'bg-green-500'
    };

    const categoryBgColor = categoryColors[category] || 'bg-gray-500';
    const gradientClass = gradientClasses[colorTheme];

    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-lg hover-lift border border-gray-100">
            {/* Hero Image or Video */}
            {videoUrl ? (
                <div className="relative h-56 w-full bg-black">
                    <iframe
                        src={videoUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={title}
                    />
                    <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs">
                        <Video className="w-3 h-3" />
                        Video
                    </div>
                </div>
            ) : imageUrl ? (
                <div className="relative h-56 w-full overflow-hidden bg-gray-100 group">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* Gradient overlay for better text readability if needed */}
                    <div className="absolute inset-0 gradient-overlay-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            ) : (
                // Fallback gradient background if no media
                <div className={`h-16 w-full ${gradientClass} flex items-center justify-center`}>
                    <Eye className="w-6 h-6 text-white/40" />
                </div>
            )}

            {/* Content */}
            <div className="p-5">
                {/* Category Badge and Timestamp */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`${categoryBgColor} text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide`}>
                            {category}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{source}</span>
                    </div>
                    {timestamp && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(timestamp)}</span>
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                    {title}
                </h3>

                {/* Full Summary - NO TRUNCATION */}
                <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                    {summary}
                </p>

                {/* Read More Link */}
                {url && (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
                    >
                        <span>Read Full Article</span>
                        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                )}
            </div>
        </div>
    );
};

export default ArticleCard;




