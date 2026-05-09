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
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            credentials: 'include', // Include cookies for JWT auth
        });
        if (!response.ok) {
            const error = (await response.json());
            throw new Error(error.message || `API error: ${response.status}`);
        }
        return response.json();
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
        return this.post(`/chat/threads/${threadId}/generate-image`, {
            prompt,
            size,
            quality,
            n,
        });
    }
}
export const apiClient = new ApiClient(API_BASE_URL);
//# sourceMappingURL=api.js.map