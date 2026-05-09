/**
 * Main chat thread component.
 */

import { useEffect, useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api'
import { Message, ThreadDetail, ChatResponseSchema } from '../../types/chat'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface ChatThreadProps {
  threadId: string
}

export function ChatThread({ threadId }: ChatThreadProps) {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const skipMessageUpdateRef = useRef(false) // Prevent useEffect from overwriting during attachment upload
  const isInitialLoadRef = useRef(true) // Track if this is the first load

  // Fetch thread with messages
  const { data: thread, isLoading: isThreadLoading, refetch: refetchThread } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => apiClient.get<ThreadDetail>(`/chat/threads/${threadId}`),
    refetchInterval: false,
  })

  // Helper function to deduplicate messages by ID
  const deduplicateMessages = (msgs: Message[]): Message[] => {
    const seen = new Set<string>()
    return msgs.filter((msg) => {
      if (seen.has(msg.id)) {
        console.log('[ChatThread] Filtering duplicate message:', msg.id)
        return false
      }
      seen.add(msg.id)
      return true
    })
  }

  // Update messages when thread data changes - watch thread.messages directly
  useEffect(() => {
    if (skipMessageUpdateRef.current) {
      return
    }
    
    if (!thread?.messages) {
      return
    }
    
    // Sort messages
    const sorted = [...thread.messages].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return aTime - bTime
    })
    
    // Update if different
    const currentIds = JSON.stringify(messages.map(m => m.id))
    const newIds = JSON.stringify(sorted.map(m => m.id))
    
    if (currentIds !== newIds) {
      console.log('[ChatThread-useEffect] Messages changed, updating from', messages.length, 'to', sorted.length)
      setMessages(sorted)
    }
    
    if (thread?.title) {
      setEditTitle(thread.title)
    }
  }, [thread?.messages]) // Watch the messages array directly

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      apiClient.post<ChatResponseSchema>(`/chat/threads/${threadId}/messages`, { content }),
    onSuccess: (response) => {
      // Replace messages: keep existing ones and add new response messages
      setMessages((prev) => {
        const updated = [...prev, response.user_message, response.assistant_message]
        // Deduplicate and sort
        const deduped = deduplicateMessages(updated)
        return deduped.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })
      setIsLoading(false)
    },
    onError: () => {
      setIsLoading(false)
      alert('Failed to send message. Please try again.')
    },
  })

  // Image generation mutation
  const imageGenerationMutation = useMutation({
    mutationFn: async ({ prompt, size, quality, n }: { prompt: string; size: string; quality: string; n: number }) => {
      return apiClient.generateImage(threadId, prompt, size, quality, n)
    },
    onSuccess: async () => {
      // Refetch thread to get updated messages with generated images
      await refetchThread()
      setIsGeneratingImage(false)
    },
    onError: () => {
      setIsGeneratingImage(false)
      alert('Failed to generate image. Please try again.')
    },
  })

  const handleGenerateImage = async (prompt: string, size: string, quality: string) => {
    setIsGeneratingImage(true)
    try {
      await imageGenerationMutation.mutateAsync({ prompt, size, quality, n: 1 })
    } catch (error) {
      console.error('Image generation failed:', error)
    }
  }

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

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    try {
      if (attachments && attachments.length > 0) {
        // FLOW FOR ATTACHMENTS: Save message → Upload files → Generate response with attachments
        const tempUserMessage: Message = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content: content,
          created_at: new Date().toISOString(),
          attachments: [],
        }
        setMessages((prev) => {
          const updated = [...prev, tempUserMessage]
          return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        })
        setIsLoading(true)

        // Step 1: Send message text to backend (just save, don't generate response yet)
        const saveResponse = await apiClient.post<ChatResponseSchema>(
          `/chat/threads/${threadId}/messages`,
          { content }
        )
        const userMessageId = saveResponse.user_message.id
        console.log('[ChatThread] User message saved with ID:', userMessageId)

        // Show ONLY user message in UI (no response yet)
        setMessages((prev) => {
          const updated = [...prev.slice(0, -1), saveResponse.user_message]
          const deduped = deduplicateMessages(updated)
          return deduped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        })

        // Step 2: Upload all files to this message
        const uploadErrors: string[] = []
        for (const file of attachments) {
          try {
            console.log(`[ChatThread] Uploading file: ${file.name}, size: ${file.size} bytes`)
            await apiClient.uploadFile(`/chat/messages/${userMessageId}/attachments`, file)
            console.log(`[ChatThread] Successfully uploaded: ${file.name}`)
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            console.error(`[ChatThread] Failed to upload ${file.name}:`, errorMsg)
            uploadErrors.push(`${file.name}: ${errorMsg}`)
          }
        }

        // Step 3: Refresh thread to get the user message WITH attachments
        skipMessageUpdateRef.current = true
        console.log('[ChatThread] Refreshing thread to load attachments...')
        const threadData = await apiClient.get<ThreadDetail>(`/chat/threads/${threadId}`)
        skipMessageUpdateRef.current = false

        // Step 4: Update the user message with attachment data
        if (threadData?.messages) {
          const userMsgWithAttachments = threadData.messages.find((m) => m.id === userMessageId)
          if (userMsgWithAttachments) {
            console.log('[ChatThread] Found user message with attachments:', userMsgWithAttachments.attachments?.length || 0)
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === userMessageId ? userMsgWithAttachments : msg
              )
              const deduped = deduplicateMessages(updated)
              return deduped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            })
          }
        }

        // Step 5: Generate LLM response NOW (with attachments visible to the model)
        console.log('[ChatThread] Generating response with attachments...')
        try {
          const assistantMessage = await apiClient.post<Message>(
            `/chat/threads/${threadId}/messages/${userMessageId}/respond`,
            {}
          )
          console.log('[ChatThread] Response generated')
          setMessages((prev) => {
            const updated = [...prev, assistantMessage]
            const deduped = deduplicateMessages(updated)
            return deduped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          })
        } catch (error) {
          console.error('[ChatThread] Failed to generate response:', error)
          const errorMsg = error instanceof Error ? error.message : 'Failed to generate response'
          alert(`Error generating response: ${errorMsg}`)
        }

        setIsLoading(false)

        // Show upload errors if any
        if (uploadErrors.length > 0) {
          alert(`Failed to upload ${uploadErrors.length} file(s):\n${uploadErrors.join('\n')}`)
        }
      } else {
        // NO ATTACHMENTS: Use original flow (send message and get response immediately)
        setIsLoading(true)
        sendMessageMutation.mutate(content)
      }
    } catch (error) {
      console.error('[ChatThread] Error in handleSendMessage:', error)
      skipMessageUpdateRef.current = false
      setIsLoading(false)
    }
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

  if (isThreadLoading && messages.length === 0) {
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
      <MessageList messages={messages} isLoading={isLoading} isGeneratingImage={isGeneratingImage} />

      {/* Input */}
      <ChatInput 
        isLoading={isLoading} 
        threadId={threadId}
        onSend={handleSendMessage}
        onGenerateImage={handleGenerateImage}
      />
    </div>
  )
}
