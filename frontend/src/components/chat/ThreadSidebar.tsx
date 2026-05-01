/**
 * Thread sidebar for listing and creating conversations.
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  const [threads, setThreads] = useState<Thread[]>([])

  // Fetch threads
  const { data: fetchedThreads } = useQuery({
    queryKey: ['threads'],
    queryFn: () => apiClient.get<Thread[]>('/chat/threads'),
    refetchInterval: false,
  })

  useEffect(() => {
    if (fetchedThreads) {
      setThreads(fetchedThreads)
    }
  }, [fetchedThreads])

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
              <button
                key={thread.id}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
