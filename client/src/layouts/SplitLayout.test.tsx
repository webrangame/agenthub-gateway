import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SplitLayout from './SplitLayout';

describe('SplitLayout', () => {
    it('renders both left and right panes', () => {
        render(
            <SplitLayout
                left={<div data-testid="left-pane">Left</div>}
                right={<div data-testid="right-pane">Right</div>}
            />
        );

        expect(screen.getByTestId('left-pane')).toHaveTextContent('Left');
        expect(screen.getByTestId('right-pane')).toHaveTextContent('Right');
    });

    it('renders with correct default styling', () => {
        const { container } = render(
            <SplitLayout left="L" right="R" />
        );
        // Grid/Flex checks
        expect(container.firstChild).toHaveClass('flex');
        expect(container.firstChild).toHaveClass('h-screen');
    });
});
