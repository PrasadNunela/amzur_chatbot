/**
 * API client for communicating with the backend.
 * All API calls must go through this module — never call fetch or axios directly in components.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

interface ApiError {
  error: string
  message: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    full_name: string | null
  }
  message: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Include cookies for JWT auth
    })

    if (!response.ok) {
      const error = (await response.json()) as ApiError
      throw new Error(error.message || `API error: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  // Example methods — add more as needed
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Auth methods
  async register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', {
      email,
      password,
      full_name: fullName,
    })
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', {
      email,
      password,
    })
  }

  async updateThreadTitle(threadId: string, title: string): Promise<Thread> {
    return this.put<Thread>(`/chat/threads/${threadId}`, {
      title,
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
