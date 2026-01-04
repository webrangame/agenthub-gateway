import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from './LoginPage';

// Mock auth utilities
jest.mock('../utils/auth', () => ({
    authLogin: jest.fn(),
    setUsername: jest.fn(),
}));

describe('LoginPage', () => {
    const mockOnLogin = jest.fn();

    beforeEach(() => {
        mockOnLogin.mockClear();
    });

    it('renders SSO login button', () => {
        render(<LoginPage onLogin={mockOnLogin} />);

        expect(screen.getByText(/Continue with SSO/i)).toBeInTheDocument();
    });

    it('renders dev login bypass in development mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        render(<LoginPage onLogin={mockOnLogin} />);

        expect(screen.getByText(/Local Dev Login/i)).toBeInTheDocument();

        process.env.NODE_ENV = originalEnv;
    });

    it('calls onLogin when dev bypass is clicked', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        render(<LoginPage onLogin={mockOnLogin} />);

        const devButton = screen.getByText(/Local Dev Login/i);
        fireEvent.click(devButton);

        expect(mockOnLogin).toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
    });

    it('redirects to SSO when SSO button is clicked', () => {
        // Mock window.location
        delete (window as any).location;
        window.location = { href: '' } as any;

        render(<LoginPage onLogin={mockOnLogin} />);

        const ssoButton = screen.getByText(/Continue with SSO/i);
        fireEvent.click(ssoButton);

        expect(window.location.href).toContain('market.niyogen.com');
    });

    it('displays app branding', () => {
        render(<LoginPage onLogin={mockOnLogin} />);

        expect(screen.getByText(/Trip Guardian/i)).toBeInTheDocument();
        expect(screen.getByText(/AI-powered travel insights/i)).toBeInTheDocument();
    });

    it('does not show dev bypass in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        render(<LoginPage onLogin={mockOnLogin} />);

        expect(screen.queryByText(/Local Dev Login/i)).not.toBeInTheDocument();

        process.env.NODE_ENV = originalEnv;
    });
});
