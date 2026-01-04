
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AlertWidget from './AlertWidget';
import JsonViewer from './JsonViewer';
import TemplateTwo from './TemplateTwo';
import { API_BASE_URL } from '../utils/api';
import { getDeviceId } from '../utils/device';
import UserMenuInline from './UserMenuInline';
import { buildMockFeed } from '../mock/mockFeed';
import { useAppSelector } from '../store/hooks';
import { useGetFeedQuery } from '../store/api/apiSlice';
import type { RootState } from '../store/store';

interface FeedItem {
    id: string;
    card_type: string;
    priority: string;
    timestamp: string;
    data: Record<string, any>;
}

interface FeedPanelProps {
    onLogout?: () => void;
    userId?: string;
}

const FeedPanel: React.FC<FeedPanelProps> = ({ onLogout, userId }) => {
    // Get user ID from Redux store (preferred) or use prop as fallback
    const user = useAppSelector((state: RootState) => state.user.user);
    const effectiveUserId = user?.id?.toString() || userId || (typeof window !== 'undefined' ? localStorage.getItem('userid') || '' : '');

    // Determine if we should use mock feed
    const useMock = (() => {
        // Run against real API (via mock) in test environment
        if (process.env.NODE_ENV === 'test') return false;

        if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_USE_MOCK_FEED === 'true';
        const param = new URLSearchParams(window.location.search).get('mockFeed');
        if (param === '0') return false;
        if (param === '1') return true;
        return process.env.NEXT_PUBLIC_USE_MOCK_FEED === 'true';
    })();

    console.error('[FeedPanel] usage: effectiveUserId:', effectiveUserId, 'useMock:', useMock, 'NODE_ENV:', process.env.NODE_ENV);

    // RTK Query for feed (skip if using mock)
    const { data: feedData, isLoading: feedLoading, error: feedError, refetch } = useGetFeedQuery(effectiveUserId || undefined, {
        pollingInterval: useMock ? 0 : 3000, // Poll every 3 seconds if not using mock
        skip: useMock, // Skip RTK Query if using mock
    });

    console.error('[FeedPanel] feedData:', JSON.stringify(feedData));

    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogs, setShowLogs] = useState(false); // Default: Hide Logs
    const [mockTick, setMockTick] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const asStringArray = (value: unknown): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
        if (typeof value === 'string') return [value].filter(Boolean);
        return [String(value)].filter(Boolean);
    };

    const asNumber = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const n = Number(value);
            if (Number.isFinite(n)) return n;
        }
        return null;
    };

    const toTemplateTwoProps = (item: FeedItem) => {
        const d = item.data || {};

        const title =
            d.title ||
            d.label ||
            d.source_node ||
            d.sourceNode ||
            item.card_type ||
            'Update';

        const description = d.description ?? d.summary ?? d.message ?? '';

        const videoUrl = d.video_url || d.videoUrl;
        const imageUrl = d.imageUrl;

        const descriptionMedia =
            videoUrl
                ? { type: 'video' as const, url: String(videoUrl) }
                : imageUrl
                    ? { type: 'image' as const, url: String(imageUrl) }
                    : undefined;

        // Sidebar: gallery + videos
        // Supports both single fields (imageUrl/videoUrl) and potential array fields (images/videos/imageUrls/videoUrls).
        const images = Array.from(
            new Set(
                [
                    ...asStringArray(d.images),
                    ...asStringArray(d.imageUrls),
                    ...asStringArray(d.imageUrl),
                ].filter(Boolean)
            )
        );

        const videos = Array.from(
            new Set(
                [
                    ...asStringArray(d.videos),
                    ...asStringArray(d.videoUrls),
                    ...asStringArray(d.videoUrl),
                    ...asStringArray(d.video_url),
                ].filter(Boolean)
            )
        );

        // Weather sidebar
        const weatherLocation =
            item.card_type === 'weather' ? (d.location || 'Destination') : undefined;
        const weatherData =
            item.card_type === 'weather'
                ? {
                    temp: String(d.temp ?? '--°C'),
                    condition: String(d.condition ?? '—'),
                    description: d.description
                        ? String(d.description)
                        : d.summary
                            ? String(d.summary)
                            : undefined,
                }
                : undefined;

        // Map embed + coordinates text
        const lat = asNumber(d.lat);
        const lng = asNumber(d.lng);
        const hasCoords = lat !== null && lng !== null;
        const mapLocation = hasCoords
            ? { lat: lat as number, lng: lng as number, label: String(d.label || title) }
            : undefined;

        const sections = [
            {
                title: String(title),
                description: String(description),
                media: descriptionMedia,
            },
            ...(hasCoords
                ? [
                    {
                        title: 'Coordinates',
                        description: `${lat}, ${lng}`,
                    },
                ]
                : []),
        ];

        // Sidebar: links
        // Supports:
        // - data.url (primary)
        // - data.links (array of {label,url} or strings)
        // - Unsplash attribution links (imageUserLink) + direct image link (imageUrl)
        const rawLinks: Array<{ label: string; url: string }> = [];

        if (d.url) rawLinks.push({ label: 'Open link', url: String(d.url) });

        // Optional: accept links array from backend
        if (Array.isArray(d.links)) {
            for (const link of d.links) {
                if (!link) continue;
                if (typeof link === 'string') {
                    rawLinks.push({ label: 'Open link', url: link });
                    continue;
                }
                if (typeof link === 'object') {
                    const label = (link as any).label ?? (link as any).title ?? 'Open link';
                    const url = (link as any).url ?? (link as any).href;
                    if (url) rawLinks.push({ label: String(label), url: String(url) });
                }
            }
        }

        if (d.imageUserLink) {
            rawLinks.push({
                label: d.imageUser ? `Photo by ${String(d.imageUser)}` : 'Photo credit',
                url: String(d.imageUserLink),
            });
        }
        if (d.imageUrl) rawLinks.push({ label: 'Open image', url: String(d.imageUrl) });

        const links = Array.from(
            new Map(rawLinks.filter((l) => l?.url).map((l) => [l.url, l])).values()
        );

        return {
            sections,
            images,
            videos,
            links,
            weatherLocation,
            weatherData,
            mapLocation,
        };
    };

    useEffect(() => {
        // Handle RTK Query feed data
        if (useMock) {
            setFeed(buildMockFeed(mockTick) as any);
            setLoading(false);
            setError(null);
        } else if (feedData) {
            console.log('Feed data received from RTK Query:', feedData);
            if (Array.isArray(feedData)) {
                // Filter and Sort
                let processedFeed = [...feedData];

                // 1. Filter Debug Nodes (unless showing logs)
                if (!showLogs) {
                    const hideNodes = ['extractDetails', 'extractCity', 'news_update', 'tips'];
                    processedFeed = processedFeed.filter(item => {
                        const isLog = item.card_type === 'log';
                        const isDebugNode = item.data && hideNodes.includes(item.data.node);
                        return !isLog && !isDebugNode;
                    });
                }

                // 2. Sort: Warnings at the bottom
                processedFeed.sort((a, b) => {
                    const isWarningA = a.card_type === 'safe_alert' || (a.data && a.data.node === 'newsAlert');
                    const isWarningB = b.card_type === 'safe_alert' || (b.data && b.data.node === 'newsAlert');

                    if (isWarningA && !isWarningB) return 1;  // A is warning, put after B
                    if (!isWarningA && isWarningB) return -1; // B is warning, put after A
                    return 0; // Keep original order otherwise
                });

                setFeed(processedFeed);
                setError(null);
            } else {
                console.warn('Feed data is not an array:', feedData);
                setFeed([]);
                setError('Invalid response format from server');
            }
            setLoading(false);
        } else if (feedError) {
            console.error('Feed API error:', feedError);
            let errorMessage = 'Failed to fetch feed';
            if ('status' in feedError) {
                // RTK Query error structure
                if ('data' in feedError && feedError.data) {
                    const errorData = feedError.data as any;
                    errorMessage = errorData?.message || errorData?.error || 'Failed to fetch feed';
                } else if ('error' in feedError) {
                    errorMessage = String(feedError.error);
                }
            }
            setError(errorMessage);
            setFeed([]);
            setLoading(false);
        } else {
            setLoading(feedLoading);
        }
    }, [mockTick, feedData, feedLoading, feedError, useMock]);

    // Poll mock feed every 3 seconds
    useEffect(() => {
        if (!useMock) return;

        const interval = setInterval(() => {
            setMockTick((t) => t + 1);
        }, 3000);

        return () => clearInterval(interval);
    }, [useMock]);

    // Listen for reset events from ChatPanel
    useEffect(() => {
        const handleFeedReset = () => {
            console.log('[FeedPanel] Received feedReset event, refreshing immediately...');
            if (!useMock) {
                refetch();
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('feedReset', handleFeedReset);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('feedReset', handleFeedReset);
            }
        };
    }, [useMock, refetch]);

    // SSE: refresh feed immediately when backend saves a new card (streaming feel)
    useEffect(() => {
        if (useMock || typeof window === 'undefined') return;

        let es: EventSource | null = null;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const scheduleRefetch = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                refetch();
            }, 200);
        };

        const userIdForStream = effectiveUserId || localStorage.getItem('userid') || '';
        const deviceId = getDeviceId();
        const qs = new URLSearchParams({ userId: userIdForStream, deviceId }).toString();

        try {
            es = new EventSource(`/api/proxy/feed/stream?${qs}`);
            es.addEventListener('feed_updated', scheduleRefetch as any);
            es.addEventListener('ping', () => { /* keep-alive */ });
            es.onerror = (e) => {
                console.warn('Feed SSE error (fallback to polling):', e);
                try { es?.close(); } catch { /* noop */ }
                es = null;
            };
        } catch (e) {
            console.warn('Failed to initialize feed SSE:', e);
        }

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            try { es?.close(); } catch { /* noop */ }
        };
    }, [useMock, effectiveUserId, refetch]);

    const renderCard = (item: FeedItem) => {
        // Filter Logs and Debug cards if toggle is off
        const debugNodes = ['extractDetails', 'extractCity', 'news_update', 'tips', 'newsAlert'];
        if (!showLogs) {
            if (item.card_type === 'log' || item.card_type === 'news_update') return null;
            if (item.data && debugNodes.includes(item.data.node)) return null;
        }

        if (!item.data) {
            console.warn('Feed item missing data:', item);
            return null;
        }

        let content: React.ReactNode = null;

        switch (item.card_type) {
            case 'safe_alert':
                // Still show safe alerts, but NOT inside TemplateTwo
                content = (
                    <AlertWidget
                        message={item.data?.message}
                        level={item.data?.level}
                    />
                );
                break;
            case 'log':
                // Logs are excluded from TemplateTwo; show only in Debug mode
                content = (
                    <div className="p-3 border border-[#9DBEF8] rounded bg-[#EEF5FF] text-[10px] font-mono text-[#003580]/70 mb-2 shadow-sm">
                        <span className="font-bold text-[#003580]">LOG:</span>{' '}
                        {item.data?.summary || JSON.stringify(item.data)}
                    </div>
                );
                break;
            case 'map_coord':
                content = (
                    <div className="p-4 border border-blue-100 rounded-xl bg-white text-xs shadow-sm">
                        <div className="flex items-center gap-2 font-bold text-blue-900 mb-2 uppercase tracking-wide text-[10px]">
                            📍 Location Data
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                            <div className="bg-blue-50 p-2 rounded">
                                <div className="text-blue-400 text-[9px] uppercase font-bold">Latitude</div>
                                <div className="font-mono text-blue-900">{item.data.lat}</div>
                            </div>
                            <div className="bg-blue-50 p-2 rounded">
                                <div className="text-blue-400 text-[9px] uppercase font-bold">Longitude</div>
                                <div className="font-mono text-blue-900">{item.data.lng}</div>
                            </div>
                        </div>
                        <JsonViewer data={item.data} label="Full Trace" />
                    </div>
                );
                break;
            default:
                // All other cards use TemplateTwo
                content = <TemplateTwo {...toTemplateTwoProps(item)} />;
                break;
        }

        if (!content) return null;

        return (
            <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className={`text-[10px] px-3 py-1.5 rounded-full font-medium transition-all duration-300 border ${showLogs
                            ? 'bg-[#003580] text-white border-[#003580] shadow-md'
                            : 'bg-[#EEF5FF] text-[#003580] border-[#9DBEF8] hover:bg-white hover:shadow-sm'
                            }`}
                    >
                        {showLogs ? 'Hide Logs' : 'Debug'}
                    </button>
                    <UserMenuInline onLogout={onLogout || (() => { })} />
                </div>
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
                                Feed API: <code className="bg-red-100 px-1 rounded">{API_BASE_URL}/api/feed</code>
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
