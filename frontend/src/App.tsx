import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useChat } from './hooks/useChat'
import { ThreadSidebar } from './components/chat/ThreadSidebar'
import { ChatThread } from './components/chat/ChatThread'
import './App.css'

const queryClient = new QueryClient()

function ChatApp() {
  const { activeThreadId, selectThread, createThread, isCreating } = useChat()

  return (
    <div className="flex h-screen bg-white dark:bg-gray-800">
      {/* Sidebar */}
      <ThreadSidebar
        activeThreadId={activeThreadId}
        onSelectThread={selectThread}
        onCreateThread={createThread}
        isCreating={isCreating}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeThreadId ? (
          <ChatThread key={activeThreadId} threadId={activeThreadId} />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Amzur AI Chat
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Start a conversation by creating a new chat
              </p>
              <button
                onClick={createThread}
                disabled={isCreating}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create New Chat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatApp />
    </QueryClientProvider>
  )
}
