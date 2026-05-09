/**
 * Chat input component for sending messages with attachments.
 */

import { useState } from 'react'
import { AttachmentInput } from '../attachments/AttachmentInput'
import { ImageGenerationModal } from './ImageGenerationModal'

interface ChatInputProps {
  isLoading: boolean
  threadId?: string
  onSend: (message: string, attachments?: File[]) => Promise<void> | void
  onGenerateImage?: (prompt: string, size: string, quality: string) => Promise<void>
}

export function ChatInput({ isLoading, threadId, onSend, onGenerateImage }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [showImageModal, setShowImageModal] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddFiles = (files: File[]) => {
    setAttachments((prev) => [...prev, ...files])
  }

  const handleGenerateImage = async (prompt: string, size: string, quality: string) => {
    if (!onGenerateImage) {
      alert('Image generation not available')
      return
    }

    setIsGeneratingImage(true)
    try {
      await onGenerateImage(prompt, size, quality)
      setShowImageModal(false)
    } catch (error) {
      console.error('Image generation failed:', error)
      alert('Failed to generate image')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((message.trim() || attachments.length > 0) && !isLoading) {
      await onSend(message.trim(), attachments.length > 0 ? attachments : undefined)
      setMessage('')
      setAttachments([])
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 space-y-3">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2 border-b dark:border-gray-700">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm group"
              >
                <span className="truncate max-w-xs">{file.name}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  ({file.size < 1024 * 1024 ? (file.size / 1024).toFixed(1) + ' KB' : (file.size / 1024 / 1024).toFixed(1) + ' MB'})
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove attachment"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message... (or add attachments)"
            disabled={isLoading || isGeneratingImage}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            onKeyDown={(e) => {
              // Allow Ctrl+Enter or Cmd+Enter to send
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleSubmit(e as any)
              }
            }}
          />

          {/* File attachment button */}
          <AttachmentInput onFilesSelected={handleAddFiles} disabled={isLoading || isGeneratingImage} />

          {/* Image generation button */}
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            disabled={isLoading || isGeneratingImage || !threadId}
            className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            title="Generate image with AI"
          >
            🎨
          </button>

          <button
            type="submit"
            disabled={isLoading || isGeneratingImage || (!message.trim() && attachments.length === 0)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>

      {/* Image generation modal */}
      <ImageGenerationModal
        isOpen={showImageModal}
        isLoading={isGeneratingImage}
        onClose={() => setShowImageModal(false)}
        onGenerate={handleGenerateImage}
      />
    </>
  )
}
