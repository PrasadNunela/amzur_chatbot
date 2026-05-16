/**
 * API client for communicating with the backend.
 * All API calls must go through this module — never call fetch or axios directly in components.
 */

import { Thread, ThreadDetail } from '../types/chat'

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

export interface DataQueryResponse {
  answer: string
  row_count: number
  column_count: number
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
        let message = `API error: ${response.status}`
        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('application/json')) {
          const error = (await response.json()) as ApiError
          message = error.message || message
        } else {
          const text = await response.text()
          if (text?.trim()) {
            message = text.trim()
          }
        }

        throw new Error(message)
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

  async queryDataframe(fileSource: string, userQuestion: string): Promise<DataQueryResponse> {
    const rootBaseUrl = this.baseUrl.endsWith('/api')
      ? this.baseUrl.slice(0, -4)
      : this.baseUrl

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
    })

    if (!response.ok) {
      const error = (await response.json()) as ApiError
      throw new Error(error.message || `Query failed: ${response.status}`)
    }

    return response.json() as Promise<DataQueryResponse>
  }

  async queryUploadedCsv(file: File, userQuestion: string): Promise<DataQueryResponse> {
    const rootBaseUrl = this.baseUrl.endsWith('/api')
      ? this.baseUrl.slice(0, -4)
      : this.baseUrl

    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_question', userQuestion)

    const response = await fetch(`${rootBaseUrl}/query/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = (await response.json()) as ApiError
      throw new Error(error.message || `Upload query failed: ${response.status}`)
    }

    return response.json() as Promise<DataQueryResponse>
  }

  async setThreadContextFromCsv(threadId: string, file: File): Promise<Thread> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.baseUrl}/chat/threads/${threadId}/context/upload`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = (await response.json()) as ApiError
      throw new Error(error.message || `Context upload failed: ${response.status}`)
    }

    return response.json() as Promise<Thread>
  }

  async setThreadContextFromSheetsUrl(threadId: string, googleSheetsUrl: string): Promise<Thread> {
    return this.post<Thread>(`/chat/threads/${threadId}/context/sheets`, {
      google_sheets_url: googleSheetsUrl,
    })
  }

  async queryThreadContext(threadId: string, userQuestion: string): Promise<DataQueryResponse> {
    const thread = await this.get<ThreadDetail>(`/chat/threads/${threadId}`)
    if (!thread.context_locked || !thread.context_type || !thread.context_source) {
      throw new Error('Thread context is not initialized')
    }

    if (thread.context_type === 'csv') {
      return this.queryDataframe(thread.context_source, userQuestion)
    }

    return this.queryDataframe(thread.context_source, userQuestion)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
