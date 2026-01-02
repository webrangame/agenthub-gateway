import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import FeedPanel from './FeedPanel';

// Mock the API module
vi.mock('../utils/api', () => ({
    API_ENDPOINTS: {
        feed: '/api/feed',
    },
    API_BASE_URL: 'http://localhost:8000'
}));

// Mock device ID
vi.mock('../utils/device', () => ({
    getDeviceId: () => 'test-device-id',
}));

// Mock Redux Hooks
const mockUseAppSelector = vi.fn();
vi.mock('../store/hooks', () => ({
    useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

// Mock RTK Query API
const mockUseGetFeedQuery = vi.fn();
vi.mock('../store/api/apiSlice', () => ({
    useGetFeedQuery: (...args: any[]) => mockUseGetFeedQuery(...args),
}));

describe('FeedPanel', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Default mocks
        mockUseAppSelector.mockReturnValue({ id: 'test-user', name: 'Test User' });
        mockUseGetFeedQuery.mockReturnValue({
            data: [],
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('renders loading state initially', () => {
        mockUseGetFeedQuery.mockReturnValue({
            data: undefined,
            isLoading: true, // RTK Query isLoading
            error: null,
            refetch: vi.fn(),
        });

        render(<FeedPanel />);
        // FeedPanel internal loading state defaults to true
        expect(screen.getByText(/Syncing Stream/i)).toBeInTheDocument();
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

        mockUseGetFeedQuery.mockReturnValue({
            data: mockFeed,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        render(<FeedPanel />);

        await waitFor(() => {
            expect(screen.getByText(/Test Article/i)).toBeInTheDocument();
        });
    });

    it('shows error state on fetch failure', async () => {
        mockUseGetFeedQuery.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: { status: 500, data: { message: 'Failed to fetch feed' } },
            refetch: vi.fn(),
        });

        render(<FeedPanel />);

        await waitFor(() => {
            expect(screen.getByText(/Failed to fetch feed/i)).toBeInTheDocument();
        });
    });

    it('shows empty state when no items', async () => {
        mockUseGetFeedQuery.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        render(<FeedPanel />);

        await waitFor(() => {
            expect(screen.getByText(/Quiet... for now/i)).toBeInTheDocument();
        });
    });

    // Note: Auto-refresh is handled by RTK Query's pollingInterval, verifying that passed param is correct
    it('configures polling interval', async () => {
        render(<FeedPanel />);

        expect(mockUseGetFeedQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({
            pollingInterval: 3000
        }));
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
                    location: 'Test City'
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

        mockUseGetFeedQuery.mockReturnValue({
            data: mockFeed,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        render(<FeedPanel />);

        await waitFor(() => {
            expect(screen.getByText(/Sunny/i)).toBeInTheDocument();
            expect(screen.getByText(/Safety warning/i)).toBeInTheDocument();
        });
    });
});
