/**
 * FilePreview component for displaying attachment previews with metadata.
 */

import { Attachment } from '../../types/chat'

interface FilePreviewProps {
  attachment: Attachment
  className?: string
}

/**
 * Get a file type icon/emoji based on the attachment type.
 */
function getFileIcon(fileType: string, mimeType: string): string {
  if (fileType === 'image') return '🖼️'
  if (fileType === 'video') return '🎥'
  if (fileType === 'code') return '💻'
  if (fileType === 'document') {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊'
    return '📋'
  }
  if (fileType === 'table') return '📊'
  return '📎'
}

/**
 * Format file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
}

export function FilePreview({ attachment, className = '' }: FilePreviewProps) {
  const icon = getFileIcon(attachment.file_type, attachment.mime_type)
  // Ensure file_size is converted to a number (backend stores as string)
  const fileSizeBytes = typeof attachment.file_size === 'string' 
    ? parseInt(attachment.file_size, 10) 
    : attachment.file_size
  const fileSize = formatFileSize(fileSizeBytes || 0)

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${className}`}>
      <span className="text-lg">{icon}</span>
      <a
        href={`/api/chat/attachments/${attachment.id}`}
        download={attachment.filename}
        className="flex-1 truncate text-blue-600 dark:text-blue-400 hover:underline"
        title={attachment.filename}
      >
        {attachment.filename}
      </a>
      <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{fileSize}</span>
    </div>
  )
}

/**
 * FilePreviewGallery component for displaying multiple attachments.
 */
interface FilePreviewGalleryProps {
  attachments: Attachment[]
  className?: string
}

export function FilePreviewGallery({ attachments, className = '' }: FilePreviewGalleryProps) {
  if (attachments.length === 0) return null

  // Separate attachments by type for better organization
  const images = attachments.filter((a) => a.file_type === 'image')
  const videos = attachments.filter((a) => a.file_type === 'video')
  const others = attachments.filter((a) => a.file_type !== 'image' && a.file_type !== 'video')

  return (
    <div className={`mt-3 space-y-3 ${className}`}>
      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {images.map((attachment) => (
            <a
              key={attachment.id}
              href={`/api/chat/attachments/${attachment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600"
              title={attachment.filename}
            >
              <img
                src={`/api/chat/attachments/${attachment.id}`}
                alt={attachment.filename}
                className="h-32 w-full object-cover group-hover:opacity-75 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                <span className="text-white text-sm">View</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((attachment) => (
            <div key={attachment.id} className="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <video controls className="w-full max-h-64 bg-black">
                <source src={`/api/chat/attachments/${attachment.id}`} type={attachment.mime_type} />
                Your browser does not support the video tag.
              </video>
            </div>
          ))}
        </div>
      )}

      {/* Other Files List */}
      {others.length > 0 && (
        <div className="space-y-2">
          {others.map((attachment) => (
            <FilePreview key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  )
}
