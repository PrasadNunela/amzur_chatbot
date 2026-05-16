/**
 * Chat message component to display individual messages with attachments.
 */

import { Message } from '../../types/chat'
import { FilePreviewGallery } from '../attachments/FilePreview'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  message: Message
  density?: 'compact' | 'cozy'
}

function normalizeMarkdownTables(content: string): string {
  if (!content) {
    return content
  }

  let normalized = content.replace(/\\n/g, '\n')

  // If the model wrapped a markdown table in a fenced block, unwrap it so GFM can render it as a table.
  normalized = normalized.replace(/```(?:markdown|md)?\s*\n([\s\S]*?)\n```/gi, (fullMatch, inner) => {
    const trimmedInner = String(inner).trim()
    const hasTableRows = trimmedInner.split('\n').some((line) => line.includes('|'))
    return hasTableRows ? trimmedInner : fullMatch
  })

  const lines = normalized.split('\n')
  const out: string[] = []

  const isTableLine = (line: string): boolean => {
    const trimmed = line.trim()
    if (!trimmed.includes('|')) {
      return false
    }

    const withoutPipes = trimmed.replace(/\|/g, '').trim()
    const isSeparator = /^:?-{3,}:?$/.test(withoutPipes.replace(/\s+/g, ''))
    return isSeparator || trimmed.startsWith('|') || trimmed.endsWith('|')
  }

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i]
    const prev = i > 0 ? lines[i - 1] : ''
    const next = i < lines.length - 1 ? lines[i + 1] : ''
    const prevIsTableLine = isTableLine(prev)
    const nextIsTableLine = isTableLine(next)

    if (isTableLine(current) && !prevIsTableLine && prev.trim() !== '' && out[out.length - 1]?.trim() !== '') {
      out.push('')
    }

    out.push(current)

    if (isTableLine(current) && !nextIsTableLine && next.trim() !== '') {
      out.push('')
    }
  }

  return out.join('\n').trim()
}

export function ChatMessage({ message, density = 'cozy' }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const normalizedContent = normalizeMarkdownTables(message.content)
  // Detect if message contains a table
  const hasTable = normalizedContent.includes('|') && normalizedContent.split('\n').some(line => line.includes('|'))

  return (
    <div className={`mb-4 flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`rounded-2xl ${density === 'compact' ? 'px-3 py-2' : 'px-4 py-3'} ${
          hasTable
            ? 'w-full max-w-full'
            : 'w-fit max-w-full'
        } ${
          isUser
            ? 'rounded-br-md bg-cyan-500 text-white'
            : 'rounded-bl-md bg-slate-700/80 text-gray-100'
        }`}
      >
        {/* Render markdown content with proper table styling */}
        <div className={`markdown-content break-words leading-relaxed ${density === 'compact' ? 'text-[0.88rem] sm:text-[0.92rem]' : 'text-sm sm:text-[0.95rem]'} ${
          hasTable ? '' : 'text-justify'
        } ${isUser ? 'text-white' : 'text-gray-100'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ node, ...props }) => (
                <div className="my-4 overflow-x-auto rounded-xl border border-slate-500/40 bg-slate-900 shadow-2xl">
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
                  <code className="rounded bg-slate-900/70 px-1 py-0.5 text-xs" {...props} />
                ) : (
                  <code className="block overflow-x-auto rounded bg-slate-900/70 p-2 text-xs" {...props} />
                ),
              pre: ({ node, ...props }) => (
                <pre className="my-2 overflow-x-auto rounded bg-slate-900/70 p-2 text-xs" {...props} />
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
            {normalizedContent}
          </ReactMarkdown>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={`mt-3 ${isUser ? 'text-white' : ''}`}>
            <FilePreviewGallery attachments={message.attachments} />
          </div>
        )}

        <span className={`mt-2 block text-xs ${isUser ? 'text-cyan-100' : 'text-slate-300'}`}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}
