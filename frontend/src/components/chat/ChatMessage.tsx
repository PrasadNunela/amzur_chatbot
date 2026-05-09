/**
 * Chat message component to display individual messages with attachments.
 */

import { Message } from '../../types/chat'
import { FilePreviewGallery } from '../attachments/FilePreview'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  // Detect if message contains a table
  const hasTable = message.content.includes('|') && message.content.split('\n').some(line => line.includes('|'))

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`px-4 py-2 rounded-lg ${
          hasTable
            ? 'max-w-2xl lg:max-w-4xl'
            : 'max-w-xs lg:max-w-md'
        } ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
        }`}
      >
        {/* Render markdown content with proper table styling */}
        <div className={`text-sm break-words markdown-content ${
          hasTable ? '' : 'text-justify'
        } ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl bg-white dark:bg-gray-900">
                  <table className="w-full border-collapse text-xs md:text-sm" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 dark:from-indigo-800 dark:via-blue-800 dark:to-cyan-800 text-white font-bold border-b-4 border-indigo-700 dark:border-indigo-900" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900" {...props} />
              ),
              tr: ({ node, ...props }) => (
                <tr className="even:bg-gray-50 dark:even:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="border-r border-gray-200 dark:border-gray-700 px-4 py-3 text-left align-middle text-gray-800 dark:text-gray-200 font-medium" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="border-r border-indigo-700 dark:border-indigo-800 px-4 py-4 font-extrabold text-left align-middle text-white uppercase tracking-wide text-xs" {...props} />
              ),
              code: ({ node, inline, className, ...props }: any) => 
                inline ? (
                  <code className="bg-gray-300 dark:bg-gray-600 px-1 py-0.5 rounded text-xs" {...props} />
                ) : (
                  <code className="block bg-gray-300 dark:bg-gray-600 p-2 rounded text-xs overflow-x-auto" {...props} />
                ),
              pre: ({ node, ...props }) => (
                <pre className="bg-gray-300 dark:bg-gray-600 p-2 rounded my-2 text-xs overflow-x-auto" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside my-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside my-1" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="my-0.5" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="my-1 whitespace-pre-wrap" {...props} />
              ),
              h1: ({ node, ...props }) => (<h1 className="text-lg font-bold my-1" {...props} />),
              h2: ({ node, ...props }) => (<h2 className="text-base font-bold my-1" {...props} />),
              h3: ({ node, ...props }) => (<h3 className="text-sm font-bold my-1" {...props} />),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={`mt-3 ${isUser ? 'text-white' : ''}`}>
            <FilePreviewGallery attachments={message.attachments} />
          </div>
        )}

        <span className={`text-xs mt-2 block ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}
