/**
 * Shared types for chat functionality.
 */

export interface Attachment {
  id: string
  filename: string
  file_path: string
  mime_type: string
  file_size: string | number
  file_type: 'image' | 'video' | 'code' | 'document' | 'table'
  created_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  attachments?: Attachment[]
}

export interface Thread {
  id: string
  title: string | null
  thread_mode: 'general' | 'data_analysis'
  thread_type?: 'general' | 'data_analysis'
  context_type: 'csv' | 'google_sheets' | null
  context_source: string | null
  file_context_url?: string | null
  context_label: string | null
  context_locked: boolean
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
  user_message: Message
  assistant_message: Message
  thread_id: string
}
