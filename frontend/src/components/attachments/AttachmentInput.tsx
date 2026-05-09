/**
 * AttachmentInput component for selecting and managing file attachments.
 */

import { useRef, useState } from 'react'

interface AttachmentInputProps {
  onFilesSelected: (files: File[]) => void
  maxFileSize?: number // in bytes
  disabled?: boolean
}

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/x-msvideo',
  'video/quicktime',
  'video/x-ms-wmv',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/json',
  'application/xml',
  'text/x-python',
  'text/javascript',
  'text/typescript',
  'text/x-java',
  'text/x-csharp',
]

export function AttachmentInput({ onFilesSelected, maxFileSize = 20 * 1024 * 1024, disabled = false }: AttachmentInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    fileArray.forEach((file) => {
      // Check MIME type
      if (!SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`❌ ${file.name}: Unsupported file type (${file.type || 'unknown'})`)
        return
      }

      // Check file size
      if (file.size > maxFileSize) {
        const maxMB = (maxFileSize / (1024 * 1024)).toFixed(0)
        errors.push(`❌ ${file.name}: File too large (max ${maxMB} MB)`)
        return
      }

      validFiles.push(file)
    })

    // Show errors if any
    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    // Call callback with valid files
    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={SUPPORTED_TYPES.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={disabled}
        className="hidden"
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors cursor-pointer ${
          disabled
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
            : dragActive
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
        title={disabled ? 'Attachments disabled while sending' : 'Click to add attachments or drag & drop files'}
      >
        <span className="text-xl">📎</span>
      </div>
    </div>
  )
}
