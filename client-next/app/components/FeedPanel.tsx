'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import WeatherCard from './WeatherCard';
import AlertWidget from './AlertWidget';
import VideoCard from './VideoCard';
import ArticleCard from './ArticleCard';
import { API_ENDPOINTS } from '../utils/api';
import { buildMockFeed } from '../mock/mockFeed';

interface FeedItem {
    id: string;
    card_type: string;
    priority: string;
    timestamp: string;
    data: Record<string, any>;
}

const FeedPanel: React.FC = () => {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogs, setShowLogs] = useState(false); // Default: Hide Logs
    const [mockTick, setMockTick] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Default behavior: use real API from production server
        // Override:
        // - ?mockFeed=0 forces real backend (default)
        // - ?mockFeed=1 forces mock
        const useMock = (() => {
            if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_USE_MOCK_FEED === 'true';
            const param = new URLSearchParams(window.location.search).get('mockFeed');
            if (param === '0') return false;
            if (param === '1') return true;
            // Default to real API (not mock) for production server
            return process.env.NEXT_PUBLIC_USE_MOCK_FEED === 'true';
        })();

        const fetchFeed = async () => {
            try {
                if (useMock) {
                    setFeed(buildMockFeed(mockTick) as any);
                    setLoading(false);
                    return;
                }

                console.log('Fetching feed from:', API_ENDPOINTS.feed);
                const res = await fetch(API_ENDPOINTS.feed, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store',
                    // Add credentials for same-origin requests
                    credentials: 'omit',
                });
                
                if (res.ok) {
                    const data = await res.json();
                    console.log('Feed data received:', data);
                    // Ensure data is an array
                    if (Array.isArray(data)) {
                        setFeed(data);
                        setError(null); // Clear any previous errors
                    } else {
                        console.warn('Feed data is not an array:', data);
                        setFeed([]);
                        setError('Invalid response format from server');
                    }
                } else {
                    const errorData = await res.json().catch(async () => {
                        const text = await res.text().catch(() => 'Unknown error');
                        return { error: text };
                    });
                    console.error('Feed API error:', res.status, errorData);
                    
                    // Set user-friendly error message
                    if (errorData.message) {
                        setError(errorData.message);
                    } else if (errorData.error) {
                        setError(errorData.error);
                    } else {
                        setError(`Failed to fetch feed (${res.status})`);
                    }
                    setFeed([]);
                }
            } catch (err: any) {
                console.error("Failed to fetch feed:", err);
                // Check if it's a network/CORS error
                if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
                    setError('Cannot connect to backend server. Please check the server status.');
                } else {
                    setError('Failed to fetch feed. Please try again.');
                }
                setFeed([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
        // Poll every 3 seconds for real-time updates
        const interval = setInterval(() => {
            if (useMock) setMockTick((t) => t + 1);
            fetchFeed();
        }, 3000);
        return () => clearInterval(interval);
    }, [mockTick]);

    const renderCard = (item: FeedItem) => {
        // Filter Logs if toggle is off
        if (!showLogs && item.card_type === 'log') return null;

        const content = (() => {
            switch (item.card_type) {
                case 'weather':
                    return <WeatherCard
                        location={item.data.location}
                        temp={item.data.temp}
                        condition={item.data.condition}
                        description={item.data.description}
                    />;
                case 'safe_alert':
                    return <AlertWidget
                        message={item.data.message}
                        level={item.data.level}
                    />;
                case 'cultural_tip':
                    return <VideoCard
                        title={item.data.title}
                        videoUrl={item.data.video_url}
                    />;
                case 'article':
                    return <ArticleCard
                        title={item.data.title}
                        summary={item.data.summary}
                        source={item.data.source}
                        imageUrl={item.data.imageUrl}
                        videoUrl={item.data.videoUrl}
                        url={item.data.url}
                        category={item.data.category}
                        colorTheme={item.data.colorTheme}
                    />;
                case 'log':
                    return (
                        <div className="p-3 border border-[#9DBEF8] rounded bg-[#EEF5FF] text-[10px] font-mono text-[#003580]/70 mb-2 shadow-sm">
                            <span className="font-bold text-[#003580]">LOG:</span> {item.data.summary || JSON.stringify(item.data)}
                        </div>
                    );
                case 'map_coord':
                    return (
                        <div className="p-4 border border-[#9DBEF8] rounded-lg bg-[#EEF5FF] text-xs text-[#003580]">
                            <div className="font-semibold mb-2">📍 Map Coordinates</div>
                            <div className="text-[10px] font-mono">
                                {item.data.lat && item.data.lng 
                                    ? `${item.data.lat}, ${item.data.lng}`
                                    : JSON.stringify(item.data)}
                            </div>
                        </div>
                    );
                default:
                    // Generic card for unknown types - show all data
                    return (
                        <div className="p-4 border border-[#9DBEF8] rounded-lg bg-[#EEF5FF] text-xs text-[#003580] shadow-sm">
                            <div className="font-semibold mb-2 text-[#003580] uppercase tracking-wide">
                                {item.card_type || 'Unknown'}
                            </div>
                            <div className="text-[10px] space-y-1">
                                {item.data && Object.keys(item.data).length > 0 ? (
                                    Object.entries(item.data).map(([key, value]) => (
                                        <div key={key} className="flex">
                                            <span className="font-mono font-semibold mr-2">{key}:</span>
                                            <span className="font-mono">
                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-400 italic">No data</div>
                                )}
                            </div>
                            {item.timestamp && (
                                <div className="text-[9px] text-gray-400 mt-2">
                                    {new Date(item.timestamp).toLocaleString()}
                                </div>
                            )}
                        </div>
                    );
            }
        })();

        if (!content) return null;

        return (
            <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout // Smooth list reordering
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                {content}
            </motion.div>
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto h-full scrollbar-thin scrollbar-thumb-[#9DBEF8] scrollbar-track-transparent">
            <div className="sticky top-0 z-10 p-4 mb-2 border-b border-[#9DBEF8]/30 flex justify-between items-center bg-white">
                <div>
                    <h2 className="text-xl font-bold text-[#003580] tracking-tight">Insight Stream</h2>
                    {feed.length > 0 && (
                        <p className="text-[10px] text-[#003580]/50 mt-0.5">
                            {feed.length} item{feed.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setShowLogs(!showLogs)}
                    className={`text-[10px] px-3 py-1.5 rounded-full font-medium transition-all duration-300 border ${
                        showLogs 
                            ? 'bg-[#003580] text-white border-[#003580] shadow-md' 
                            : 'bg-[#EEF5FF] text-[#003580] border-[#9DBEF8] hover:bg-white hover:shadow-sm'
                    }`}
                >
                    {showLogs ? 'Hide Logs' : 'Debug'}
                </button>
            </div>

            <div className="space-y-4 px-4 pb-20">
                {loading ? (
                    <div className="text-center text-[#003580]/50 py-12 animate-pulse text-xs uppercase tracking-widest font-semibold">Syncing Stream...</div>
                ) : error ? (
                    <div className="text-center py-12 px-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                            <div className="text-red-800 font-semibold mb-2">⚠️ Connection Error</div>
                            <div className="text-red-600 text-sm mb-3">{error}</div>
                            <div className="text-red-500 text-xs">
                                Feed API: <code className="bg-red-100 px-1 rounded">http://107.23.26.219:8080/api/feed</code>
                            </div>
                        </div>
                    </div>
                ) : feed.length === 0 ? (
                    <div className="text-center text-[#003580]/40 py-12 italic text-sm">Quiet... for now.</div>
                ) : (
                    feed.map(renderCard)
                )}
            </div>
        </div>
    );
};

export default FeedPanel;
