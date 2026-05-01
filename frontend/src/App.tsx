import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useChat } from './hooks/useChat'
import { useAuth } from './hooks/useAuth'
import { ThreadSidebar } from './components/chat/ThreadSidebar'
import { ChatThread } from './components/chat/ChatThread'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import './App.css'

const queryClient = new QueryClient()

type Page = 'chat' | 'login' | 'register'

function ChatApp() {
  const { activeThreadId, selectThread, createThread, isCreating } = useChat()
  const { user, logout, register: authRegister, login: authLogin } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('login')
  
  // Sync page based on auth state
  useEffect(() => {
    if (user) {
      setCurrentPage('chat')
    } else {
      setCurrentPage('login')
    }
  }, [user])

  // Handle registration success
  const handleRegisterSuccess = async (email: string, password: string, fullName?: string) => {
    try {
      await authRegister(email, password, fullName)
      // User state is automatically updated by useAuth hook
      // Navigation happens via useEffect above
    } catch (err) {
      console.error('Registration failed:', err)
    }
  }

  // Handle login success
  const handleLoginSuccess = async (email: string, password: string) => {
    try {
      await authLogin(email, password)
      // User state is automatically updated by useAuth hook
      // Navigation happens via useEffect above
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  if (!user) {
    return currentPage === 'login' ? (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateToRegister={() => setCurrentPage('register')}
      />
    ) : (
      <RegisterPage
        onRegisterSuccess={handleRegisterSuccess}
        onNavigateToLogin={() => setCurrentPage('login')}
      />
    )
  }

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
        {/* Header with user info */}
        <div className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {user.full_name || user.email}
          </h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
          >
            Logout
          </button>
        </div>

        {/* Chat content */}
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
