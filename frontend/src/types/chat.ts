/**
 * Shared types for chat functionality.
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Thread {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface ThreadDetail extends Thread {
  messages: Message[]
}

export interface ChatMessage {
  content: string
}

export interface ChatResponseSchema {
  message: Message
  thread_id: string
}
