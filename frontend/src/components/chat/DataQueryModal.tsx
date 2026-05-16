import { useState } from 'react'

import { apiClient, DataQueryResponse } from '../../lib/api'
import { CsvOrSheetSourceInput } from './CsvOrSheetSourceInput'

interface DataQueryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DataQueryModal({ isOpen, onClose }: DataQueryModalProps) {
  const [question, setQuestion] = useState('What is the total sales for year 2025?')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DataQueryResponse | null>(null)

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (
    payload: { type: 'file'; file: File } | { type: 'url'; url: string },
  ) => {
    setError(null)
    setResult(null)

    if (!question.trim()) {
      setError('Question is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = payload.type === 'file'
        ? await apiClient.queryUploadedCsv(payload.file, question.trim())
        : await apiClient.queryDataframe(payload.url, question.trim())
      setResult(response)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Request failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Data Query Tester</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Question
            </label>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <CsvOrSheetSourceInput isSubmitting={isSubmitting} onSubmit={handleSubmit} />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
            <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">Answer</p>
            <p className="text-sm text-gray-900 dark:text-white">{result.answer}</p>
            <div className="mt-3 flex gap-4 text-xs text-gray-700 dark:text-gray-300">
              <span>Rows: {result.row_count}</span>
              <span>Columns: {result.column_count}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
