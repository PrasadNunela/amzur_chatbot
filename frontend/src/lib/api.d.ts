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
export interface DataQueryResponse {
    answer: string;
    row_count: number;
    column_count: number;
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
        images?: any[];
        model?: string;
        error?: string;
    }>;
    queryDataframe(fileSource: string, userQuestion: string): Promise<DataQueryResponse>;
    queryUploadedCsv(file: File, userQuestion: string): Promise<DataQueryResponse>;
    setThreadContextFromCsv(threadId: string, file: File): Promise<Thread>;
    setThreadContextFromSheetsUrl(threadId: string, googleSheetsUrl: string): Promise<Thread>;
    queryThreadContext(threadId: string, userQuestion: string): Promise<DataQueryResponse>;
    getResearchDigestStreamUrl(params: {
        topic: string;
        maxIterations?: number;
        confidenceThreshold?: number;
        maxResultsPerSearch?: number;
    }): string;
}
export declare const apiClient: ApiClient;
export {};
//# sourceMappingURL=api.d.ts.map