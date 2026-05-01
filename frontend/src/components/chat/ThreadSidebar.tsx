/**
 * Thread sidebar for listing and creating conversations.
 */

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api'
import { Thread } from '../../types/chat'

interface ThreadSidebarProps {
  activeThreadId: string | null
  onSelectThread: (threadId: string) => void
  onCreateThread: () => void
  isCreating?: boolean
}

export function ThreadSidebar({
  activeThreadId,
  onSelectThread,
  onCreateThread,
  isCreating = false,
}: ThreadSidebarProps) {
  const queryClient = useQueryClient()
  const [threads, setThreads] = useState<Thread[]>([])
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Fetch threads
  const { data: fetchedThreads, refetch: refetchThreads } = useQuery({
    queryKey: ['threads'],
    queryFn: () => apiClient.get<Thread[]>('/chat/threads'),
    refetchInterval: false,
  })

  useEffect(() => {
    if (fetchedThreads) {
      setThreads(fetchedThreads)
    }
  }, [fetchedThreads])

  // Update title mutation
  const updateTitleMutation = useMutation({
    mutationFn: ({ threadId, title }: { threadId: string; title: string }) =>
      apiClient.updateThreadTitle(threadId, title),
    onSuccess: (data) => {
      setEditingThreadId(null)
      refetchThreads()
      // Also invalidate the thread detail query so main area gets updated
      queryClient.invalidateQueries({ queryKey: ['thread', data.id] })
    },
    onError: () => {
      alert('Failed to update title')
      setEditingThreadId(null)
    },
  })

  const handleStartEdit = (thread: Thread) => {
    setEditingThreadId(thread.id)
    setEditTitle(thread.title || '')
  }

  const handleSaveTitle = (threadId: string) => {
    const trimmedTitle = editTitle.trim()
    if (trimmedTitle) {
      updateTitleMutation.mutate({ threadId, title: trimmedTitle })
    } else {
      setEditingThreadId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingThreadId(null)
  }

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <button
          onClick={onCreateThread}
          disabled={isCreating}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors font-semibold"
        >
          {isCreating ? 'Creating...' : '+ New Chat'}
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No conversations yet. Create one to start chatting!
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {threads.map((thread) => (
              <div key={thread.id} className="group relative">
                {editingThreadId === thread.id ? (
                  <div className="flex gap-1 px-2 py-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm rounded bg-white dark:bg-gray-800 border border-blue-500 text-gray-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveTitle(thread.id)}
                      disabled={updateTitleMutation.isPending}
                      className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updateTitleMutation.isPending}
                      className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectThread(thread.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                      activeThreadId === thread.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                    title={thread.title || 'Untitled Conversation'}
                  >
                    {thread.title || 'Untitled Conversation'}
                  </button>
                )}
                {activeThreadId === thread.id && editingThreadId !== thread.id && (
                  <button
                    onClick={() => handleStartEdit(thread)}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-opacity"
                    title="Rename"
                  >
                    ✏️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
