/**
 * Custom hook for managing chat state.
 */

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { Thread } from '../types/chat'

interface AuthUser {
  id: string
  email: string
  full_name: string | null
}

export function useChat() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Get current user from localStorage
  const getCurrentUserId = (): string | null => {
    try {
      const stored = localStorage.getItem('authUser')
      if (stored) {
        const user: AuthUser = JSON.parse(stored)
        return user.id
      }
    } catch (e) {
      console.error('Failed to get user from localStorage:', e)
    }
    return null
  }

  // Fetch threads - include userId in queryKey for user-specific caching
  const { data: threads = [], refetch } = useQuery({
    queryKey: ['threads', getCurrentUserId()], // Include userId for user-specific cache
    queryFn: () => apiClient.get<Thread[]>('/chat/threads'),
  })

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: () => apiClient.post<Thread>('/chat/threads', { title: null }),
    onSuccess: (data) => {
      // Refetch threads to get the latest list
      refetch()
      setActiveThreadId(data.id)
    },
    onError: (error) => {
      console.error('Failed to create thread:', error)
      alert('Failed to create thread. Please try again.')
    },
  })

  const selectThread = (threadId: string) => {
    setActiveThreadId(threadId)
  }

  const createThread = () => {
    createThreadMutation.mutate()
  }

  // Clear threads when user logs out
  const clearThreads = useCallback(() => {
    setActiveThreadId(null)
    // Invalidate all threads queries
    queryClient.removeQueries({ queryKey: ['threads'] })
  }, [queryClient])

  return {
    activeThreadId,
    selectThread,
    createThread,
    threads,
    isCreating: createThreadMutation.isPending,
    clearThreads,
  }
}
