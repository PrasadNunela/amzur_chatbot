/**
 * API client for communicating with the backend.
 * All API calls must go through this module — never call fetch or axios directly in components.
 */
import { Thread } from '../types/chat';
export interface AuthResponse {
    user: {
        id: string;
        email: string;
        full_name: string | null;
    };
    message: string;
}
declare class ApiClient {
    private baseUrl;
    constructor(baseUrl: string);
    private request;
    get<T>(endpoint: string): Promise<T>;
    post<T>(endpoint: string, data?: unknown): Promise<T>;
    put<T>(endpoint: string, data?: unknown): Promise<T>;
    delete<T>(endpoint: string): Promise<T>;
    register(email: string, password: string, fullName?: string): Promise<AuthResponse>;
    login(email: string, password: string): Promise<AuthResponse>;
    googleLogin(googleToken: string): Promise<AuthResponse>;
    updateThreadTitle(threadId: string, title: string): Promise<Thread>;
    deleteThread(threadId: string): Promise<{
        message: string;
    }>;
    uploadFile(endpoint: string, file: File): Promise<{
        attachment_id: string;
    }>;
    generateImage(threadId: string, prompt: string, size?: string, quality?: string, n?: number): Promise<{
        success: boolean;
        count?: number;
        images?: any[];
        model?: string;
        prompt?: string;
        error?: string;
    }>;
}
export declare const apiClient: ApiClient;
export {};
//# sourceMappingURL=api.d.ts.map