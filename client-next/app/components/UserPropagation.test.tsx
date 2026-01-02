import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import FeedPanel from './FeedPanel';
import ChatPanel from './ChatPanel';

// Mock API endpoints
vi.mock('../utils/api', () => ({
    API_ENDPOINTS: {
        chat: '/api/chat/stream',
        feed: '/api/feed',
    },
}));

// Mock device ID
vi.mock('../utils/device', () => ({
    getDeviceId: () => 'test-device-id',
}));

// Mock auth
vi.mock('../utils/auth', () => ({
    getLiteLLMApiKey: () => 'test-api-key',
}));

describe('User Identity Propagation', () => {
    beforeEach(() => {
        localStorage.clear();
        global.fetch = vi.fn((url, options) => {
            console.log('Fetch called:', url, JSON.stringify(options, null, 2));
            return Promise.resolve(new Response('{}', { status: 200 }));
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('FeedPanel', () => {
        it('prioritizes userId prop over localStorage', async () => {
            // Setup: localStorage has 'stored-user', but prop is 'prop-user'
            localStorage.setItem('userid', 'stored-user');

            const mockResponse = new Response('[]', { status: 200 });
            (global.fetch as any).mockResolvedValue(mockResponse);

            render(<FeedPanel userId="prop-user" />);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'X-User-ID': 'prop-user'
                        })
                    })
                );
            });
        });

        it('falls back to localStorage if prop is missing', async () => {
            localStorage.setItem('userid', 'stored-user');

            const mockResponse = new Response('[]', { status: 200 });
            (global.fetch as any).mockResolvedValue(mockResponse);

            render(<FeedPanel />);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'X-User-ID': 'stored-user'
                        })
                    })
                );
            });
        });

        it('uses empty string if neither are present', async () => {
            const mockResponse = new Response('[]', { status: 200 });
            (global.fetch as any).mockResolvedValue(mockResponse);

            render(<FeedPanel />);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'X-User-ID': ''
                        })
                    })
                );
            });
        });
    });

    describe('ChatPanel', () => {
        it('uses userId prop in headers', async () => {
            localStorage.setItem('userid', 'stored-user');

            const mockResponse = new Response('data: {}\n\n', { status: 200 });
            (global.fetch as any).mockResolvedValue(mockResponse);

            render(<ChatPanel userId="prop-user" />);

            const input = screen.getByPlaceholderText(/Type your plans/i);
            const sendButton = screen.getByRole('button', { name: /send/i });

            fireEvent.change(input, { target: { value: 'Hello' } });
            fireEvent.click(sendButton);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'X-User-ID': 'prop-user'
                        })
                    })
                );
            });
        });
    });
});
