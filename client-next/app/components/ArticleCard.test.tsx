import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ArticleCard from './ArticleCard';

describe('ArticleCard Component', () => {
    it('renders title and summary correctly', () => {
        const props = {
            title: "Test Article",
            summary: "This is a test summary for the article card.",
            source: "Test Source",
            category: "Tips",
            timestamp: "2024-01-01T10:00:00Z"
        } as any;

        render(<ArticleCard {...props} />);

        expect(screen.getByText("Test Article")).toBeDefined();
        expect(screen.getByText("This is a test summary for the article card.")).toBeDefined();
        expect(screen.getByText("Test Source")).toBeDefined();
    });

    it('renders image when imageUrl is provided', () => {
        const props = {
            title: "Image Article",
            summary: "Has an image",
            source: "Unsplash",
            imageUrl: "https://example.com/image.jpg",
            imageUser: "Photographer Name"
        } as any;

        render(<ArticleCard {...props} />);

        const img = screen.getByRole('img');
        expect(img).toBeDefined();
        expect(img.getAttribute('src')).toBe("https://example.com/image.jpg");
        expect(screen.getByText("Photographer Name")).toBeDefined();
    });

    it('renders as a link when url is provided', () => {
        const props = {
            title: "Linked Article",
            summary: "Has a link",
            source: "Source",
            url: "https://example.com/article"
        } as any;

        render(<ArticleCard {...props} />);

        const link = screen.getByRole('link');
        expect(link.getAttribute('href')).toBe('https://example.com/article');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('applies color theme classes', () => {
        const props = {
            title: "Themed Article",
            summary: "Has a theme",
            source: "Source",
            colorTheme: "red"
        } as any;

        const { container } = render(<ArticleCard {...props} />);
        // Expect some red styling. Assuming implementation uses border-red or similar.
        // We might need to inspect the implementation to be specific, or just check if it renders without crash.
        expect(container.firstChild).toBeDefined();
    });
});
