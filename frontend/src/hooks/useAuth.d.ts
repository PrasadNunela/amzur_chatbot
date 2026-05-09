/**
 * Custom hook for managing authentication state.
 */
interface AuthUser {
    id: string;
    email: string;
    full_name: string | null;
}
export declare function useAuth(): {
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    register: (email: string, password: string, fullName?: string) => Promise<{
        id: string;
        email: string;
        full_name: string | null;
    }>;
    login: (email: string, password: string) => Promise<{
        id: string;
        email: string;
        full_name: string | null;
    }>;
    googleLogin: (googleToken: string) => Promise<{
        id: string;
        email: string;
        full_name: string | null;
    }>;
    logout: () => void;
    isAuthenticated: boolean;
};
export {};
//# sourceMappingURL=useAuth.d.ts.map