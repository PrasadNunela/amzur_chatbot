/**
 * Chat message list component.
 */

import { useEffect, useRef } from 'react'
import { Message } from '../../types/chat'
import { ChatMessage } from './ChatMessage'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  isGeneratingImage?: boolean
  density?: 'compact' | 'cozy'
}

export function MessageList({ messages, isLoading, isGeneratingImage, density = 'cozy' }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGeneratingImage])

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-7">
      <div
        className={`w-full ${
          density === 'compact' ? 'space-y-2' : 'space-y-3'
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center text-slate-300">
            <div className="text-center">
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-300">Ready</p>
              <p className="mb-2 text-lg font-semibold">Start a conversation</p>
              <p className="text-sm text-slate-400">Ask anything, then add context whenever you need data-grounded answers.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} density={density} />
            ))}
            {isGeneratingImage && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                  <LoadingSpinner size="sm" text="Generating image..." />
                </div>
              </div>
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 delay-100"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
