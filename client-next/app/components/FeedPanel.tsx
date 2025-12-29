'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AlertWidget from './AlertWidget';
import TemplateTwo from './TemplateTwo';
import { API_ENDPOINTS, API_BASE_URL } from '../utils/api';
import { getDeviceId } from '../utils/device';
import UserMenuInline from './UserMenuInline';
import { buildMockFeed } from '../mock/mockFeed';

interface FeedItem {
    id: string;
    card_type: string;
    priority: string;
    timestamp: string;
    data: Record<string, any>;
}

interface FeedPanelProps {
    onLogout?: () => void;
}

const FeedPanel: React.FC<FeedPanelProps> = ({ onLogout }) => {
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
                        'X-Device-ID': getDeviceId(),
                        'X-User-ID': typeof window !== 'undefined' ? localStorage.getItem('userid') || '' : '',
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

        // SSE: refresh feed immediately when backend saves a new card (streaming feel)
        let es: EventSource | null = null;
        let debounceTimer: any = null;

        const scheduleFetch = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchFeed();
            }, 200);
        };

        if (!useMock && typeof window !== 'undefined') {
            const userId = localStorage.getItem('userid') || '';
            const deviceId = getDeviceId();
            const qs = new URLSearchParams({ userId, deviceId }).toString();
            es = new EventSource(`/api/proxy/feed/stream?${qs}`);
            es.addEventListener('feed_updated', scheduleFetch as any);
            es.addEventListener('ping', () => { /* keep-alive */ });
            es.onerror = (e) => {
                console.warn('Feed SSE error (fallback to polling):', e);
                try { es?.close(); } catch { /* noop */ }
                es = null;
            };
        }

        // Poll as fallback (slower) in case SSE drops
        const interval = setInterval(() => {
            if (useMock) setMockTick((t) => t + 1);
            fetchFeed();
        }, 15000);

        return () => {
            clearInterval(interval);
            if (debounceTimer) clearTimeout(debounceTimer);
            try { es?.close(); } catch { /* noop */ }
        };
    }, [mockTick]);

    const renderCard = (item: FeedItem) => {
        // Filter Logs if toggle is off
        if (!showLogs && item.card_type === 'log') return null;

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
                    {onLogout && <UserMenuInline onLogout={onLogout} />}
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
