/**
 * Main chat thread component.
 */

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api'
import { Message, ThreadDetail, ChatResponseSchema } from '../../types/chat'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'

interface ChatThreadProps {
  threadId: string
}

export function ChatThread({ threadId }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch thread with messages
  const { data: thread, isLoading: isThreadLoading } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => apiClient.get<ThreadDetail>(`/chat/threads/${threadId}`),
    refetchInterval: false,
  })

  // Update messages when thread data changes
  useEffect(() => {
    if (thread?.messages) {
      setMessages(thread.messages)
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
      <div className="bg-blue-500 text-white px-4 py-3 shadow">
        <h2 className="text-lg font-semibold">
          {thread?.title || 'New Conversation'}
        </h2>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput isLoading={isLoading} onSend={handleSendMessage} />
    </div>
  )
}
