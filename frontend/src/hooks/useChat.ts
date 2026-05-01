/**
 * Custom hook for managing chat state.
 */

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { Thread } from '../types/chat'

export function useChat() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  // Fetch threads
  const { data: threads = [], refetch } = useQuery({
    queryKey: ['threads'],
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

  return {
    activeThreadId,
    selectThread,
    createThread,
    threads,
    isCreating: createThreadMutation.isPending,
  }
}
