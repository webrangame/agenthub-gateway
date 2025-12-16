// Authentication utilities

export const AUTH_CREDENTIALS = {
    username: 'NiyoGen_first',
    password: 'Dr_Jack',
};

export const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('isAuthenticated') === 'true';
};

export const login = (username: string, password: string): boolean => {
    if (
        username === AUTH_CREDENTIALS.username &&
        password === AUTH_CREDENTIALS.password
    ) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', username);
        return true;
    }
    return false;
};

export const logout = (): void => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
};

export const getUsername = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('username');
};

