import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import ChatPanel from './ChatPanel';

// Mock the API module
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

// Mock Redux Hooks
const mockUseAppSelector = vi.fn();
vi.mock('../store/hooks', () => ({
    useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

// Mock RTK Query Mutations
const mockDeleteFeedMutation = vi.fn();
vi.mock('../store/api/apiSlice', () => ({
    useDeleteFeedMutation: () => [mockDeleteFeedMutation],
}));

describe('ChatPanel', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Mock fetch
        global.fetch = vi.fn();

        // Mock scrollIntoView
        window.HTMLElement.prototype.scrollIntoView = vi.fn();

        // Default Redux Mocks
        mockUseAppSelector.mockReturnValue({ id: 'test-user', name: 'Test' });
        mockDeleteFeedMutation.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders welcome message', () => {
        render(<ChatPanel />);
        expect(screen.getByText(/Hello! I'm your Trip Guardian/i)).toBeInTheDocument();
    });

    it('sends message on button click', async () => {
        const mockResponse = new Response('data: {"text": "Test response"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
        });

        (global.fetch as Mock).mockResolvedValueOnce(mockResponse);

        render(<ChatPanel />);

        const input = screen.getByPlaceholderText(/Type your plans/i);
        // Use exact name match for accessibility
        const sendButton = screen.getByRole('button', { name: /Send Message/i });

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/chat/stream'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"client_time":'),
                })
            );
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/chat/stream'),
                expect.objectContaining({
                    body: expect.stringContaining('"user_location":"Unknown"'),
                })
            );
        });
    });

    it('sends message on Enter key press', async () => {
        const mockResponse = new Response('data: {"text": "Test"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
        });

        (global.fetch as Mock).mockResolvedValueOnce(mockResponse);

        render(<ChatPanel />);

        const input = screen.getByPlaceholderText(/Type your plans/i);

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    it('does not send on Shift+Enter', () => {
        render(<ChatPanel />);

        const input = screen.getByPlaceholderText(/Type your plans/i);

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders in collapsed mode', () => {
        render(<ChatPanel isCollapsed={true} />);

        expect(screen.getByText(/Trip Guardian/i)).toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/Type your plans/i)).not.toBeInTheDocument();
    });

    it('calls onToggleCollapse when expand button is clicked', () => {
        const mockToggle = vi.fn();
        render(<ChatPanel isCollapsed={true} onToggleCollapse={mockToggle} />);

        const expandButton = screen.getByTitle(/Expand Panel/i);
        fireEvent.click(expandButton);

        expect(mockToggle).toHaveBeenCalled();
    });

    it('clears conversation on reset', async () => {
        // Mock window.confirm
        window.confirm = vi.fn(() => true);

        const mockResponse = new Response('', { status: 200 });
        (global.fetch as Mock).mockResolvedValueOnce(mockResponse);

        // Spy on custom event dispatch
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

        render(<ChatPanel />);

        const resetButton = screen.getByTitle(/Reset Conversation/i);
        fireEvent.click(resetButton);

        await waitFor(() => {
            // Verify mutation was called instead of direct fetch
            expect(mockDeleteFeedMutation).toHaveBeenCalled();
        });

        // Verify feedReset event was dispatched
        await waitFor(() => {
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'feedReset'
                })
            );
        });

        expect(screen.getByText(/Conversations cleared/i)).toBeInTheDocument();

        dispatchEventSpy.mockRestore();
    });

    it('shows error message on fetch failure', async () => {
        (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

        render(<ChatPanel />);

        const input = screen.getByPlaceholderText(/Type your plans/i);
        const sendButton = screen.getByRole('button', { name: /Send Message/i });

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText(/encountered an error connecting to the Gateway/i)).toBeInTheDocument();
        });
    });
});
