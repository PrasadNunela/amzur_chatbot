/**
 * API client for communicating with the backend.
 * All API calls must go through this module — never call fetch or axios directly in components.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
class ApiClient {
    constructor(baseUrl) {
        Object.defineProperty(this, "baseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.baseUrl = baseUrl;
    }
    async request(endpoint, options) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('[ApiClient-request] STEP 1 - Making request:', {
            method: options?.method || 'GET',
            endpoint,
            url,
            hasBody: !!options?.body
        });
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
                credentials: 'include', // Include cookies for JWT auth
            });
            console.log('[ApiClient-request] STEP 2 - Response received:', {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText,
                headers: {
                    contentType: response.headers.get('content-type')
                }
            });
            if (!response.ok) {
                console.error('[ApiClient-request] ERROR - Response not OK:', {
                    status: response.status,
                    url
                });
                let message = `API error: ${response.status}`;
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const error = (await response.json());
                    message = error.message || message;
                }
                else {
                    const text = await response.text();
                    if (text?.trim()) {
                        message = text.trim();
                    }
                }
                throw new Error(message);
            }
            console.log('[ApiClient-request] STEP 3 - Parsing JSON response');
            const data = await response.json();
            console.log('[ApiClient-request] STEP 4 - JSON parsed successfully, type:', typeof data);
            return data;
        }
        catch (error) {
            console.error('[ApiClient-request] ERROR - Request failed:', {
                error,
                message: error instanceof Error ? error.message : String(error),
                endpoint,
                url
            });
            throw error;
        }
    }
    // Example methods — add more as needed
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
    // Auth methods
    async register(email, password, fullName) {
        return this.post('/auth/register', {
            email,
            password,
            full_name: fullName,
        });
    }
    async login(email, password) {
        return this.post('/auth/login', {
            email,
            password,
        });
    }
    async googleLogin(googleToken) {
        console.log('[API] Calling /auth/google/token with token...');
        try {
            const result = await this.post('/auth/google/token', {
                token: googleToken,
            });
            console.log('[API] Google login successful:', result);
            return result;
        }
        catch (err) {
            console.error('[API] Google login failed:', err);
            throw err;
        }
    }
    async updateThreadTitle(threadId, title) {
        return this.put(`/chat/threads/${threadId}`, {
            title,
        });
    }
    async deleteThread(threadId) {
        return this.delete(`/chat/threads/${threadId}`);
    }
    async uploadFile(endpoint, file) {
        const formData = new FormData();
        formData.append('file', file);
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Include cookies for JWT auth
            // Don't set Content-Type header — let the browser set it with the boundary
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `File upload failed: ${response.status}`);
        }
        return response.json();
    }
    async generateImage(threadId, prompt, size = '1024x1024', quality = 'standard', n = 1) {
        return this.post(`/chat/threads/${threadId}/generate-image`, { prompt, size, quality, n });
    }
    async queryDataframe(fileSource, userQuestion) {
        const rootBaseUrl = this.baseUrl.endsWith('/api')
            ? this.baseUrl.slice(0, -4)
            : this.baseUrl;
        const response = await fetch(`${rootBaseUrl}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                file_source: fileSource,
                user_question: userQuestion,
            }),
        });
        if (!response.ok) {
            const error = (await response.json());
            throw new Error(error.message || `Query failed: ${response.status}`);
        }
        return response.json();
    }
    async queryUploadedCsv(file, userQuestion) {
        const rootBaseUrl = this.baseUrl.endsWith('/api')
            ? this.baseUrl.slice(0, -4)
            : this.baseUrl;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_question', userQuestion);
        const response = await fetch(`${rootBaseUrl}/query/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });
        if (!response.ok) {
            const error = (await response.json());
            throw new Error(error.message || `Upload query failed: ${response.status}`);
        }
        return response.json();
    }
    async setThreadContextFromCsv(threadId, file) {
        const formData = new FormData();
        formData.append('file', file);
        const url = `${this.baseUrl}/chat/threads/${threadId}/context/upload`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });
        if (!response.ok) {
            const error = (await response.json());
            throw new Error(error.message || `Context upload failed: ${response.status}`);
        }
        return response.json();
    }
    async setThreadContextFromSheetsUrl(threadId, googleSheetsUrl) {
        return this.post(`/chat/threads/${threadId}/context/sheets`, {
            google_sheets_url: googleSheetsUrl,
        });
    }
    async queryThreadContext(threadId, userQuestion) {
        const thread = await this.get(`/chat/threads/${threadId}`);
        if (!thread.context_locked || !thread.context_type || !thread.context_source) {
            throw new Error('Thread context is not initialized');
        }
        if (thread.context_type === 'csv') {
            return this.queryDataframe(thread.context_source, userQuestion);
        }
        return this.queryDataframe(thread.context_source, userQuestion);
    }
    getResearchDigestStreamUrl(params) {
        const rootBaseUrl = this.baseUrl.endsWith('/api')
            ? this.baseUrl.slice(0, -4)
            : this.baseUrl;
        const query = new URLSearchParams({
            topic: params.topic,
            max_iterations: String(params.maxIterations ?? 4),
            confidence_threshold: String(params.confidenceThreshold ?? 7),
            max_results_per_search: String(params.maxResultsPerSearch ?? 8),
        });
        return `${rootBaseUrl}/api/research-digest/stream?${query.toString()}`;
    }
}
export const apiClient = new ApiClient(API_BASE_URL);
//# sourceMappingURL=api.js.map