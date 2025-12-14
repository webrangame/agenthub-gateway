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
    card_type: 'weather' | 'safe_alert' | 'cultural_tip' | 'map_coord' | 'article' | 'log';
    priority: string;
    data: any;
}

const FeedPanel: React.FC = () => {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogs, setShowLogs] = useState(false); // Default: Hide Logs
    const [mockTick, setMockTick] = useState(0);

    useEffect(() => {
        // Default behavior: use mock feed in dev so you can observe all card types.
        // Override:
        // - ?mockFeed=0 forces real backend
        // - ?mockFeed=1 forces mock
        const useMock = (() => {
            if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_USE_MOCK_FEED === 'true';
            const param = new URLSearchParams(window.location.search).get('mockFeed');
            if (param === '0') return false;
            if (param === '1') return true;
            return process.env.NEXT_PUBLIC_USE_MOCK_FEED === 'true' || process.env.NODE_ENV !== 'production';
        })();

        const fetchFeed = async () => {
            try {
                if (useMock) {
                    setFeed(buildMockFeed(mockTick) as any);
                    setLoading(false);
                    return;
                }

                const res = await fetch(API_ENDPOINTS.feed);
                if (res.ok) {
                    const data = await res.json();
                    setFeed(data);
                }
            } catch (err) {
                console.error("Failed to fetch feed:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
        // Poll every 10s for now (simulating stream)
        const interval = setInterval(() => {
            if (useMock) setMockTick((t) => t + 1);
            fetchFeed();
        }, 3000); // Faster polling for demo
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
                            <span className="font-bold text-[#003580]">LOG:</span> {item.data.summary}
                        </div>
                    );
                default:
                    return (
                        <div className="p-4 border border-[#9DBEF8] rounded-lg bg-[#EEF5FF] text-xs text-[#003580]">
                            Unknown Content: {item.card_type}
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
                <h2 className="text-xl font-bold text-[#003580] tracking-tight">Insight Stream</h2>
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
                ) : (
                    feed.map(renderCard)
                )}

                {!loading && feed.length === 0 && (
                    <div className="text-center text-[#003580]/40 py-12 italic text-sm">Quiet... for now.</div>
                )}
            </div>
        </div>
    );
};

export default FeedPanel;
