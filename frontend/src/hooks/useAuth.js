/**
 * Custom hook for managing authentication state.
 */
import { useState } from 'react';
import { apiClient } from '../lib/api';
export function useAuth() {
    const [user, setUser] = useState(() => {
        // Try to restore user from localStorage
        const stored = localStorage.getItem('authUser');
        return stored ? JSON.parse(stored) : null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const register = async (email, password, fullName) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.register(email, password, fullName);
            setUser(response.user);
            localStorage.setItem('authUser', JSON.stringify(response.user));
            return response.user;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            setError(message);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    };
    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.login(email, password);
            setUser(response.user);
            localStorage.setItem('authUser', JSON.stringify(response.user));
            return response.user;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    };
    const googleLogin = async (googleToken) => {
        console.log('[useAuth] googleLogin called');
        setIsLoading(true);
        setError(null);
        try {
            console.log('[useAuth] Calling apiClient.googleLogin...');
            const response = await apiClient.googleLogin(googleToken);
            console.log('[useAuth] Response:', response);
            setUser(response.user);
            localStorage.setItem('authUser', JSON.stringify(response.user));
            console.log('[useAuth] User set, auth complete');
            return response.user;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Google login failed';
            console.error('[useAuth] Error:', message, err);
            setError(message);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    };
    const logout = () => {
        setUser(null);
        localStorage.removeItem('authUser');
        // Optionally call a logout endpoint to clear the server-side token
    };
    return {
        user,
        isLoading,
        error,
        register,
        login,
        googleLogin,
        logout,
        isAuthenticated: !!user,
    };
}
//# sourceMappingURL=useAuth.js.map