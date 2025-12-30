import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPanel from './ChatPanel';

// Mock the API module
jest.mock('../utils/api', () => ({
    API_ENDPOINTS: {
        chat: '/api/chat/stream',
        feed: '/api/feed',
    },
}));

// Mock device ID
jest.mock('../utils/device', () => ({
    getDeviceId: () => 'test-device-id',
}));

describe('ChatPanel', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Mock fetch
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('renders welcome message', () => {
        render(<ChatPanel />);
        expect(screen.getByText(/Hello! I'm your Trip Guardian/i)).toBeInTheDocument();
    });

    it('sends message on button click', async () => {
        const mockResponse = new Response('data: {"text": "Test response"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        render(<ChatPanel />);

        const input = screen.getByPlaceholderText(/Type your plans/i);
        const sendButton = screen.getByRole('button', { name: /send/i });

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/chat/stream'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ input: 'Test message' }),
                })
            );
        });
    });

    it('sends message on Enter key press', async () => {
        const mockResponse = new Response('data: {"text": "Test"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

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
        const mockToggle = jest.fn();
        render(<ChatPanel isCollapsed={true} onToggleCollapse={mockToggle} />);

        const expandButton = screen.getByTitle(/Expand Panel/i);
        fireEvent.click(expandButton);

        expect(mockToggle).toHaveBeenCalled();
    });

    it('clears conversation on reset', async () => {
        // Mock window.confirm
        window.confirm = jest.fn(() => true);

        const mockResponse = new Response('', { status: 200 });
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        render(<ChatPanel />);

        const resetButton = screen.getByTitle(/Reset Conversation/i);
        fireEvent.click(resetButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/feed'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        expect(screen.getByText(/Conversations cleared/i)).toBeInTheDocument();
    });

    it('shows error message on fetch failure', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        render(<ChatPanel />);

        const input = screen.getByPlaceholderText(/Type your plans/i);
        const sendButton = screen.getByRole('button', { name: /send/i });

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText(/encountered an error connecting to the Gateway/i)).toBeInTheDocument();
        });
    });
});
