import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CapabilityLayoutMapper from './CapabilityLayoutMapper';

// Mock the spec file if valid (or just rely on the real one since it's config)
// Since we imported spec directly in the component, mocking it requires vi.mock
// For now, we test against the *actual* spec which is a valid integration test.

describe('CapabilityLayoutMapper', () => {
    it('renders Split View for trip-guardian capability', () => {
        render(<CapabilityLayoutMapper capabilities={['trip-guardian']} />);

        // Split View should contain ChatPanel and FeedPanel
        expect(screen.getByText(/Chat Interaction Zone/i)).toBeInTheDocument();
        expect(screen.getByText(/Insight Stream/i)).toBeInTheDocument();
    });

    it('renders Terminal for code-interpreter capability', () => {
        // Note: The spec defined code-interpreter as Split View (Chat + Terminal)
        render(<CapabilityLayoutMapper capabilities={['code-interpreter']} />);

        expect(screen.getByText(/Chat Interaction Zone/i)).toBeInTheDocument();
        expect(screen.getByText(/Terminal Mock View/i)).toBeInTheDocument();
    });

    it('falls back to Chat for unknown/basic capability', () => {
        // 'chat' capability or default
        render(<CapabilityLayoutMapper capabilities={['chat']} />);

        expect(screen.getByText(/Chat Interaction Zone/i)).toBeInTheDocument();
        // Feed should NOT be there
        expect(screen.queryByText(/Insight Stream/i)).not.toBeInTheDocument();
    });
});
