import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPanel from './FeedPanel';

// Mock the API module
jest.mock('../utils/api', () => ({
    API_ENDPOINTS: {
        feed: '/api/feed',
    },
}));

// Mock device ID
jest.mock('../utils/device', () => ({
    getDeviceId: () => 'test-device-id',
}));

describe('FeedPanel', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('renders loading state initially', () => {
        (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => { }));

        render(<FeedPanel />);

        expect(screen.getByText(/Loading insights/i)).toBeInTheDocument();
    });

    it('fetches and displays feed items', async () => {
        const mockFeed = [
            {
                id: '1',
                card_type: 'article',
                priority: 'medium',
                timestamp: new Date().toISOString(),
                source_node: 'TestNode',
                data: {
                    title: 'Test Article',
                    summary: 'Test summary content',
                    category: 'Tips',
                },
            },
        ];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockFeed,
        });

        render(<FeedPanel />);

        await waitFor(() => {
            expect(screen.getByText(/Test Article/i)).toBeInTheDocument();
        });
    });

    it('shows error state on fetch failure', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        render(<FeedPanel />);

        await waitFor(() => {
            expect(screen.getByText(/Failed to load feed/i)).toBeInTheDocument();
        });
    });

    it('shows empty state when no items', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(<FeedPanel />);

        await waitFor(() => {
            expect(screen.getByText(/No insights yet/i)).toBeInTheDocument();
        });
    });

    it('auto-refreshes every 3 seconds', async () => {
        const mockFeed = [];

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockFeed,
        });

        render(<FeedPanel />);

        // Initial fetch
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        // Advance timer by 3 seconds
        jest.advanceTimersByTime(3000);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        // Advance again
        jest.advanceTimersByTime(3000);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });
    });

    it('renders different card types correctly', async () => {
        const mockFeed = [
            {
                id: '1',
                card_type: 'weather',
                priority: 'medium',
                timestamp: new Date().toISOString(),
                source_node: 'CheckWeather',
                data: {
                    condition: 'Sunny',
                    temp: '25°C',
                    description: 'Clear skies',
                },
            },
            {
                id: '2',
                card_type: 'safe_alert',
                priority: 'high',
                timestamp: new Date().toISOString(),
                source_node: 'NewsAlert',
                data: {
                    message: 'Safety warning',
                    level: 'warning',
                },
            },
        ];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockFeed,
        });

        render(<FeedPanel />);

        await waitFor(() => {
            expect(screen.getByText(/Sunny/i)).toBeInTheDocument();
            expect(screen.getByText(/Safety warning/i)).toBeInTheDocument();
        });
    });

    it('includes device ID in request headers', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(<FeedPanel />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/feed'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Device-ID': 'test-device-id',
                    }),
                })
            );
        });
    });
});
