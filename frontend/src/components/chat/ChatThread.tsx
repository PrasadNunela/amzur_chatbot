/**
 * Main chat thread component.
 */

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api'
import { Message, ThreadDetail, ChatResponseSchema } from '../../types/chat'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'

interface ChatThreadProps {
  threadId: string
}

export function ChatThread({ threadId }: ChatThreadProps) {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  // Fetch thread with messages
  const { data: thread, isLoading: isThreadLoading, refetch: refetchThread } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => apiClient.get<ThreadDetail>(`/chat/threads/${threadId}`),
    refetchInterval: false,
  })

  // Update messages when thread data changes
  useEffect(() => {
    if (thread?.messages) {
      setMessages(thread.messages)
    }
    if (thread?.title) {
      setEditTitle(thread.title)
    }
  }, [thread])

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      apiClient.post<ChatResponseSchema>(`/chat/threads/${threadId}/messages`, { content }),
    onSuccess: (response) => {
      // The response contains both the user message (implicit) and assistant message
      setMessages((prev) => [...prev, response.message])
      setIsLoading(false)
    },
    onError: () => {
      setIsLoading(false)
      alert('Failed to send message. Please try again.')
    },
  })

  // Update thread title mutation
  const updateTitleMutation = useMutation({
    mutationFn: (title: string) => apiClient.updateThreadTitle(threadId, title),
    onSuccess: () => {
      setIsEditingTitle(false)
      refetchThread()
      // Also invalidate the threads list in sidebar so it reflects the new title
      queryClient.invalidateQueries({ queryKey: ['threads'] })
    },
    onError: () => {
      alert('Failed to update title. Please try again.')
      setIsEditingTitle(false)
    },
  })

  const handleSendMessage = (content: string) => {
    // Optimistically add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    sendMessageMutation.mutate(content)
  }

  const handleSaveTitle = () => {
    const trimmedTitle = editTitle.trim()
    if (trimmedTitle && trimmedTitle !== thread?.title) {
      updateTitleMutation.mutate(trimmedTitle)
    } else {
      setIsEditingTitle(false)
    }
  }

  const handleCancelEdit = () => {
    setEditTitle(thread?.title || '')
    setIsEditingTitle(false)
  }

  if (isThreadLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Loading thread...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="bg-blue-500 text-white px-4 py-3 shadow flex items-center justify-between">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter conversation title"
              className="flex-1 px-2 py-1 rounded bg-blue-600 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white"
              autoFocus
            />
            <button
              onClick={handleSaveTitle}
              disabled={updateTitleMutation.isPending}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded text-sm font-semibold"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={updateTitleMutation.isPending}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <h2 className="text-lg font-semibold">
              {thread?.title || 'Untitled Conversation'}
            </h2>
            <button
              onClick={() => setIsEditingTitle(true)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
              title="Rename conversation"
            >
              ✏️ Rename
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput isLoading={isLoading} onSend={handleSendMessage} />
    </div>
  )
}
