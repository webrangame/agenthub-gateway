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
});
