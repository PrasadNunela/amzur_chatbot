/**
 * API client for communicating with the backend.
 * All API calls must go through this module — never call fetch or axios directly in components.
 */

import { Thread } from '../types/chat'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000/api'

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
    console.log('[ApiClient-request] STEP 1 - Making request:', { 
      method: options?.method || 'GET',
      endpoint,
      url,
      hasBody: !!options?.body
    })

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Include cookies for JWT auth
      })

      console.log('[ApiClient-request] STEP 2 - Response received:', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText,
        headers: {
          contentType: response.headers.get('content-type')
        }
      })

      if (!response.ok) {
        console.error('[ApiClient-request] ERROR - Response not OK:', { 
          status: response.status, 
          url 
        })
        const error = (await response.json()) as ApiError
        throw new Error(error.message || `API error: ${response.status}`)
      }

      console.log('[ApiClient-request] STEP 3 - Parsing JSON response')
      const data = await response.json() as T
      console.log('[ApiClient-request] STEP 4 - JSON parsed successfully, type:', typeof data)
      return data
    } catch (error) {
      console.error('[ApiClient-request] ERROR - Request failed:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        endpoint,
        url
      })
      throw error
    }
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

  async googleLogin(googleToken: string): Promise<AuthResponse> {
    console.log('[API] Calling /auth/google/token with token...')
    try {
      const result = await this.post<AuthResponse>('/auth/google/token', {
        token: googleToken,
      })
      console.log('[API] Google login successful:', result)
      return result
    } catch (err) {
      console.error('[API] Google login failed:', err)
      throw err
    }
  }

  async updateThreadTitle(threadId: string, title: string): Promise<Thread> {
    return this.put<Thread>(`/chat/threads/${threadId}`, {
      title,
    })
  }

  async deleteThread(threadId: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/chat/threads/${threadId}`)
  }

  async uploadFile(endpoint: string, file: File): Promise<{ attachment_id: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies for JWT auth
      // Don't set Content-Type header — let the browser set it with the boundary
    })

    if (!response.ok) {
      const error = await response.json() as ApiError
      throw new Error(error.message || `File upload failed: ${response.status}`)
    }

    return response.json() as Promise<{ attachment_id: string }>
  }

  async generateImage(
    threadId: string,
    prompt: string,
    size: string = '1024x1024',
    quality: string = 'standard',
    n: number = 1,
  ): Promise<{ success: boolean; images?: any[]; model?: string; error?: string }> {
    return this.post<{ success: boolean; images?: any[]; model?: string; error?: string }>(
      `/chat/threads/${threadId}/generate-image`,
      { prompt, size, quality, n },
    )
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
