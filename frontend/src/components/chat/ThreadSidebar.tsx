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
  isCollapsed: boolean
  onToggleCollapsed: () => void
}

export function ThreadSidebar({
  activeThreadId,
  onSelectThread,
  onCreateThread,
  isCreating = false,
  isCollapsed,
  onToggleCollapsed,
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

  const getDisplayTitle = (thread: Thread): string => {
    if (thread.context_label) {
      return `${thread.context_label} Chat`
    }
    return thread.title || 'Untitled Conversation'
  }

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-72'} h-full border-r border-slate-700/70 bg-slate-900/90 backdrop-blur flex flex-col transition-all`}>
      {/* Header */}
      <div className="border-b border-slate-700/80 p-4">
        <div className="space-y-2">
          <button
            onClick={onToggleCollapsed}
            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-2 py-2 text-sm font-semibold text-slate-100"
          >
            {isCollapsed ? '»' : '«'}
          </button>
          <button
            onClick={onCreateThread}
            disabled={isCreating}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-white hover:from-cyan-400 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 transition-colors font-semibold"
          >
            {isCollapsed ? '+' : isCreating ? 'Creating...' : '+ New Chat'}
          </button>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-400">
            {isCollapsed ? 'No chats' : 'No conversations yet. Create one to start chatting!'}
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {threads.map((thread) => (
              <div key={thread.id} className="group relative">
                {editingThreadId === thread.id ? (
                  <div className="flex gap-1 px-2 py-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 rounded-lg border border-cyan-500 bg-slate-800 px-2 py-1 text-sm text-slate-100 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveTitle(thread.id)}
                      disabled={updateTitleMutation.isPending}
                      className="rounded px-2 py-1 text-xs bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updateTitleMutation.isPending}
                      className="rounded px-2 py-1 text-xs bg-slate-500 text-white hover:bg-slate-600 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectThread(thread.id)}
                    className={`w-full truncate rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                      activeThreadId === thread.id
                        ? 'border-cyan-400/80 bg-cyan-500/20 text-cyan-100 shadow'
                        : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-slate-500 hover:bg-slate-700/70'
                    }`}
                    title={getDisplayTitle(thread)}
                  >
                    {isCollapsed ? '•' : getDisplayTitle(thread)}
                  </button>
                )}
                {activeThreadId === thread.id && editingThreadId !== thread.id && (
                  <button
                    onClick={() => handleStartEdit(thread)}
                    className="absolute right-2 top-2 rounded bg-cyan-500 px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:bg-cyan-600 group-hover:opacity-100"
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
