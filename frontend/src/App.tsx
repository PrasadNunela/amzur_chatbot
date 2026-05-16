import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useChat } from './hooks/useChat'
import { useAuth } from './hooks/useAuth'
import { ThreadSidebar } from './components/chat/ThreadSidebar'
import { ChatThread } from './components/chat/ChatThread'
import { DataQueryModal } from './components/chat/DataQueryModal'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import './App.css'

const queryClient = new QueryClient()
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || ''

type Page = 'chat' | 'login' | 'register'

function ChatApp() {
  const { user, logout, register: authRegister, login: authLogin, googleLogin: authGoogleLogin } = useAuth()
  const { activeThreadId, selectThread, createThread, isCreating, clearThreads } = useChat()
  const [currentPage, setCurrentPage] = useState<Page>('login')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showDataQueryModal, setShowDataQueryModal] = useState(false)
  
  // Sync page based on auth state
  useEffect(() => {
    console.log('[App] User state changed:', user)
    if (user) {
      console.log('[App] Setting page to chat')
      setCurrentPage('chat')
    } else {
      console.log('[App] Setting page to login, clearing threads')
      setCurrentPage('login')
      clearThreads() // Clear threads when user logs out
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

  // Handle Google login success
  const handleGoogleLoginSuccess = async (googleToken: string) => {
    try {
      await authGoogleLogin(googleToken)
      // User state is automatically updated by useAuth hook
      // Navigation happens via useEffect above
    } catch (err) {
      console.error('Google login failed:', err)
    }
  }

  if (!user) {
    return currentPage === 'login' ? (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onLoginSuccessGoogle={handleGoogleLoginSuccess}
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
    <div className="app-shell relative flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-950/60 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 md:static md:z-auto ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <ThreadSidebar
          activeThreadId={activeThreadId}
          onSelectThread={(threadId) => {
            selectThread(threadId)
            setMobileSidebarOpen(false)
          }}
          onCreateThread={() => {
            createThread()
            setMobileSidebarOpen(false)
          }}
          isCreating={isCreating}
          isCollapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="mx-2 mt-2 flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-3 backdrop-blur md:mx-3 md:px-5">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-slate-100 md:hidden"
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-slate-100 md:text-base">
                {user.full_name || user.email}
              </h1>
              <p className="text-xs text-slate-400">Unified AI Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createThread}
              disabled={isCreating}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 md:text-sm"
            >
              {isCreating ? 'Creating...' : 'New Chat'}
            </button>
            <button
              onClick={() => setShowDataQueryModal(true)}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 md:text-sm"
            >
              Data Lab
            </button>
            <button
              onClick={logout}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 md:text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="m-2 flex min-h-0 flex-1 rounded-2xl border border-slate-700/70 bg-slate-900/70 backdrop-blur md:m-3">
          {activeThreadId ? (
            <ChatThread key={activeThreadId} threadId={activeThreadId} />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6">
              <div className="max-w-xl rounded-3xl border border-slate-700/80 bg-slate-900/80 p-8 text-center shadow-2xl">
                <p className="mb-3 text-xs uppercase tracking-[0.35em] text-cyan-300">Workspace Ready</p>
                <h2 className="mb-3 text-3xl font-bold text-slate-100 md:text-4xl">
                  Start a New Chat
                </h2>
                <p className="mb-7 text-sm text-slate-300 md:text-base">
                  Launch a regular conversation instantly, then attach a CSV or Google Sheet anytime to switch into data analysis mode.
                </p>
                <button
                  onClick={createThread}
                  disabled={isCreating}
                  className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'New Chat'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DataQueryModal
        isOpen={showDataQueryModal}
        onClose={() => setShowDataQueryModal(false)}
      />
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
const AppWithAuth = () => {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <QueryClientProvider client={queryClient}>
        <ChatApp />
      </QueryClientProvider>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <ChatApp />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  )
}

export default function App() {
  return <AppWithAuth />
}
