'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import WeatherCard from './WeatherCard';
import AlertWidget from './AlertWidget';
import VideoCard from './VideoCard';
import ArticleCard from './ArticleCard';
import { API_ENDPOINTS } from '../utils/api';

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

    useEffect(() => {
        const fetchFeed = async () => {
            try {
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
        const interval = setInterval(fetchFeed, 3000); // Faster polling for demo
        return () => clearInterval(interval);
    }, []);

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
                        <div className="p-2 border border-gray-100 rounded bg-gray-50 text-[10px] font-mono text-gray-400 mb-2">
                            <span className="font-bold text-gray-500">LOG:</span> {item.data.summary}
                        </div>
                    );
                default:
                    return (
                        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-500">
                            Unknown Content: {item.card_type}
                        </div>
                    );
            }
        })();

        if (!content) return null;

        return (
            <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                layout // Smooth list reordering
                transition={{ duration: 0.3 }}
            >
                {content}
            </motion.div>
        );
    };

    return (
        <div className="flex-1 flex flex-col p-4 bg-gray-50 overflow-y-auto h-full">
            <div className="sticky top-0 bg-gray-50/95 backdrop-blur z-10 pb-4 mb-2 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 tracking-tight">Insight Stream</h2>
                <button
                    onClick={() => setShowLogs(!showLogs)}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${showLogs ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                >
                    {showLogs ? 'Hide Logs' : 'Debug'}
                </button>
            </div>

            <div className="space-y-4 pb-20">
                {loading ? (
                    <div className="text-center text-gray-400 py-8 animate-pulse text-xs">Syncing...</div>
                ) : (
                    feed.map(renderCard)
                )}

                {!loading && feed.length === 0 && (
                    <div className="text-center text-gray-400 py-8 italic text-sm">Quiet... for now.</div>
                )}
            </div>
        </div>
    );
};

export default FeedPanel;




