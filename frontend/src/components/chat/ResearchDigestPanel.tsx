import { useMemo, useState } from 'react'
import { useResearchDigestStream } from '../../hooks/useResearchDigestStream'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ResearchDigestPanel({ isOpen, onClose }: Props) {
  const [topic, setTopic] = useState('quantum error correction with transformers')
  const {
    events,
    digestText,
    isRunning,
    error,
    latestState,
    start,
    stop,
    reset,
  } = useResearchDigestStream()

  const statusFeed = useMemo(
    () => events.filter((event) => event.type === 'status').map((event, index) => ({
      key: `${index}-${String(event.data.message ?? 'status')}`,
      text: String(event.data.message ?? ''),
      query: event.data.query ? String(event.data.query) : null,
    })),
    [events],
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Autonomous Research Digest Agent</h2>
            <p className="text-xs text-slate-400">Real-time iterative arXiv loop with evidential stopping threshold</p>
          </div>
          <button
            onClick={() => {
              stop()
              onClose()
            }}
            className="rounded-lg border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="grid h-[calc(92vh-73px)] grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-3 overflow-auto rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <label className="text-xs uppercase tracking-wider text-slate-400">Research Topic</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-24 rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm outline-none focus:border-cyan-400"
            />

            <div className="flex gap-2">
              <button
                disabled={isRunning || topic.trim().length < 3}
                onClick={() =>
                  start({
                    topic: topic.trim(),
                    maxIterations: 5,
                    confidenceThreshold: 7,
                    maxResultsPerSearch: 8,
                  })
                }
                className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {isRunning ? 'Running...' : 'Start Agent'}
              </button>
              <button
                onClick={stop}
                disabled={!isRunning}
                className="rounded-lg border border-rose-500/70 px-3 py-2 text-sm text-rose-300 disabled:opacity-50"
              >
                Stop
              </button>
              <button
                onClick={reset}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
              >
                Reset
              </button>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs">
              <p className="mb-2 font-semibold text-slate-300">Loop State</p>
              {latestState ? (
                <pre className="whitespace-pre-wrap text-slate-300">{JSON.stringify(latestState, null, 2)}</pre>
              ) : (
                <p className="text-slate-500">No state updates yet.</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs">
              <p className="mb-2 font-semibold text-slate-300">Status Feed</p>
              <div className="max-h-64 space-y-2 overflow-auto">
                {statusFeed.length === 0 && <p className="text-slate-500">Waiting for events...</p>}
                {statusFeed.map((item) => (
                  <div key={item.key} className="rounded-md border border-slate-700 bg-slate-950/70 p-2">
                    <p>{item.text}</p>
                    {item.query && <p className="mt-1 text-cyan-300">query: {item.query}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Streaming Digest</h3>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-900/80 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{digestText || 'Digest tokens will stream here...'}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
