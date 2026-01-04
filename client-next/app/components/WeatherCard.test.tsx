import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WeatherCard from './WeatherCard';

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    },
}));

// Mock lucide-react to verify icon selection
vi.mock('lucide-react', () => ({
    CloudRain: () => <div data-testid="icon-rain">Rain Icon</div>,
    Sun: () => <div data-testid="icon-sun">Sun Icon</div>,
    Cloud: () => <div data-testid="icon-cloud">Cloud Icon</div>,
    Wind: () => <div data-testid="icon-wind">Wind Icon</div>,
    CloudSnow: () => <div data-testid="icon-snow">Snow Icon</div>,
    CloudDrizzle: () => <div data-testid="icon-drizzle">Drizzle Icon</div>,
    Cloudy: () => <div data-testid="icon-cloudy">Cloudy Icon</div>,
    MapPin: () => <div data-testid="icon-map-pin">Map Pin</div>,
}));

describe('WeatherCard Component', () => {
    const defaultProps = {
        location: 'Test City',
        temp: '20°C',
        condition: 'Clear',
        description: 'Sunny day'
    };

    it('others base details correctly', () => {
        render(<WeatherCard {...defaultProps} />);

        expect(screen.getByText('Test City')).toBeDefined();
        expect(screen.getByText('20°C')).toBeDefined();
        expect(screen.getByText('Clear')).toBeDefined();
        expect(screen.getByText('Live Update')).toBeDefined();
    });

    it('renders description when provided', () => {
        render(<WeatherCard {...defaultProps} />);
        expect(screen.getByText('Sunny day')).toBeDefined();
    });

    it('does not render description when missing', () => {
        const props = { ...defaultProps, description: undefined };
        render(<WeatherCard {...props} />);
        // Ensure description element is not present. 
        // Note: queryByText returns null if not found.
        expect(screen.queryByText('Sunny day')).toBeNull();
    });

    it('maps "rain" condition to Rain Icon', () => {
        render(<WeatherCard {...defaultProps} condition="Heavy Rain" />);
        expect(screen.getByTestId('icon-rain')).toBeDefined();
    });

    it('maps "sun" condition to Sun Icon', () => {
        render(<WeatherCard {...defaultProps} condition="Sunny" />);
        expect(screen.getByTestId('icon-sun')).toBeDefined();
    });

    it('maps unknown condition to Cloud Icon (default)', () => {
        render(<WeatherCard {...defaultProps} condition="Unknown Weather" />);
        expect(screen.getByTestId('icon-cloud')).toBeDefined();
    });
});
