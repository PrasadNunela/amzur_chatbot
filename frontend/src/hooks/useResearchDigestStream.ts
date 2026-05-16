import { useMemo, useRef, useState } from 'react'
import { apiClient } from '../lib/api'

export interface StreamEvent {
  type: 'status' | 'state' | 'token' | 'complete' | 'error'
  data: Record<string, unknown>
}

interface StartOptions {
  topic: string
  maxIterations?: number
  confidenceThreshold?: number
  maxResultsPerSearch?: number
}

export function useResearchDigestStream() {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [digestText, setDigestText] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  const stop = () => {
    sourceRef.current?.close()
    sourceRef.current = null
    setIsRunning(false)
  }

  const reset = () => {
    setEvents([])
    setDigestText('')
    setError(null)
  }

  const start = ({
    topic,
    maxIterations = 4,
    confidenceThreshold = 7,
    maxResultsPerSearch = 8,
  }: StartOptions) => {
    stop()
    reset()
    setIsRunning(true)

    const url = apiClient.getResearchDigestStreamUrl({
      topic,
      maxIterations,
      confidenceThreshold,
      maxResultsPerSearch,
    })

    const source = new EventSource(url, { withCredentials: true })
    sourceRef.current = source

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as StreamEvent
        setEvents((prev) => [...prev, parsed])

        if (parsed.type === 'token') {
          const token = String(parsed.data.text ?? '')
          setDigestText((prev) => prev + token)
        }

        if (parsed.type === 'error') {
          setError(String(parsed.data.message ?? 'Stream failed'))
          stop()
        }

        if (parsed.type === 'complete') {
          stop()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse stream event')
        stop()
      }
    }

    source.onerror = () => {
      setError('Connection to research stream failed')
      stop()
    }
  }

  const latestState = useMemo(() => {
    const stateEvent = [...events].reverse().find((event) => event.type === 'state')
    return stateEvent?.data ?? null
  }, [events])

  return {
    events,
    digestText,
    isRunning,
    error,
    latestState,
    start,
    stop,
    reset,
  }
}
