import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useChat } from './hooks/useChat';
import { useAuth } from './hooks/useAuth';
import { ThreadSidebar } from './components/chat/ThreadSidebar';
import { ChatThread } from './components/chat/ChatThread';
import { DataQueryModal } from './components/chat/DataQueryModal';
import { ResearchDigestPanel } from './components/chat/ResearchDigestPanel';
import { TicTacToePanel } from './components/chat/TicTacToePanel';
import { ContractAnalysisPanel } from './components/chat/ContractAnalysisPanel';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import './App.css';
const queryClient = new QueryClient();
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
function ChatApp() {
    const { user, logout, register: authRegister, login: authLogin, googleLogin: authGoogleLogin } = useAuth();
    const { activeThreadId, selectThread, createThread, isCreating, clearThreads } = useChat();
    const [currentPage, setCurrentPage] = useState('login');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [showDataQueryModal, setShowDataQueryModal] = useState(false);
    const [showResearchDigestPanel, setShowResearchDigestPanel] = useState(false);
    const [showTicTacToe, setShowTicTacToe] = useState(false);
    const [showContractAnalysisPanel, setShowContractAnalysisPanel] = useState(false);
    // Sync page based on auth state
    useEffect(() => {
        console.log('[App] User state changed:', user);
        if (user) {
            console.log('[App] Setting page to chat');
            setCurrentPage('chat');
        }
        else {
            console.log('[App] Setting page to login, clearing threads');
            setCurrentPage('login');
            clearThreads(); // Clear threads when user logs out
        }
    }, [user]);
    // Handle registration success
    const handleRegisterSuccess = async (email, password, fullName) => {
        try {
            await authRegister(email, password, fullName);
            // User state is automatically updated by useAuth hook
            // Navigation happens via useEffect above
        }
        catch (err) {
            console.error('Registration failed:', err);
        }
    };
    // Handle login success
    const handleLoginSuccess = async (email, password) => {
        try {
            await authLogin(email, password);
            // User state is automatically updated by useAuth hook
            // Navigation happens via useEffect above
        }
        catch (err) {
            console.error('Login failed:', err);
        }
    };
    // Handle Google login success
    const handleGoogleLoginSuccess = async (googleToken) => {
        try {
            await authGoogleLogin(googleToken);
            // User state is automatically updated by useAuth hook
            // Navigation happens via useEffect above
        }
        catch (err) {
            console.error('Google login failed:', err);
        }
    };
    if (!user) {
        return currentPage === 'login' ? (_jsx(LoginPage, { onLoginSuccess: handleLoginSuccess, onLoginSuccessGoogle: handleGoogleLoginSuccess, onNavigateToRegister: () => setCurrentPage('register') })) : (_jsx(RegisterPage, { onRegisterSuccess: handleRegisterSuccess, onNavigateToLogin: () => setCurrentPage('login') }));
    }
    return (_jsxs("div", { className: "app-shell relative flex h-screen overflow-hidden bg-slate-950 text-slate-100", children: [_jsx("div", { className: "ambient-orb ambient-orb-a" }), _jsx("div", { className: "ambient-orb ambient-orb-b" }), mobileSidebarOpen && (_jsx("button", { type: "button", className: "fixed inset-0 z-20 bg-slate-950/60 md:hidden", onClick: () => setMobileSidebarOpen(false), "aria-label": "Close sidebar" })), _jsx("div", { className: `fixed inset-y-0 left-0 z-30 transition-transform duration-300 md:static md:z-auto ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`, children: _jsx(ThreadSidebar, { activeThreadId: activeThreadId, onSelectThread: (threadId) => {
                        selectThread(threadId);
                        setMobileSidebarOpen(false);
                    }, onCreateThread: () => {
                        createThread();
                        setMobileSidebarOpen(false);
                    }, isCreating: isCreating, isCollapsed: sidebarCollapsed, onToggleCollapsed: () => setSidebarCollapsed((prev) => !prev) }) }), _jsxs("div", { className: "relative z-10 flex min-w-0 flex-1 flex-col", children: [_jsxs("div", { className: "mx-2 mt-2 flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-3 backdrop-blur md:mx-3 md:px-5", children: [_jsxs("div", { className: "flex items-center gap-2 md:gap-3", children: [_jsx("button", { type: "button", onClick: () => setMobileSidebarOpen(true), className: "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-slate-100 md:hidden", "aria-label": "Open sidebar", children: "\u2630" }), _jsxs("div", { children: [_jsx("h1", { className: "text-sm font-semibold tracking-wide text-slate-100 md:text-base", children: user.full_name || user.email }), _jsx("p", { className: "text-xs text-slate-400", children: "Unified AI Workspace" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: createThread, disabled: isCreating, className: "rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 md:text-sm", children: isCreating ? 'Creating...' : 'New Chat' }), _jsx("button", { onClick: () => setShowDataQueryModal(true), className: "rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 md:text-sm", children: "Data Lab" }), _jsx("button", { onClick: () => setShowResearchDigestPanel(true), className: "rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 md:text-sm", children: "Research Lab" }), _jsx("button", { onClick: () => setShowContractAnalysisPanel(true), className: "rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20 md:text-sm", children: "Contract Tool" }), _jsx("button", { onClick: () => setShowTicTacToe(true), className: "rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 md:text-sm", children: "Play Game" }), _jsx("button", { onClick: logout, className: "rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 md:text-sm", children: "Logout" })] })] }), _jsx("div", { className: "m-2 flex min-h-0 flex-1 rounded-2xl border border-slate-700/70 bg-slate-900/70 backdrop-blur md:m-3", children: activeThreadId ? (_jsx(ChatThread, { threadId: activeThreadId }, activeThreadId)) : (_jsx("div", { className: "flex h-full w-full items-center justify-center p-6", children: _jsxs("div", { className: "max-w-xl rounded-3xl border border-slate-700/80 bg-slate-900/80 p-8 text-center shadow-2xl", children: [_jsx("p", { className: "mb-3 text-xs uppercase tracking-[0.35em] text-cyan-300", children: "Workspace Ready" }), _jsx("h2", { className: "mb-3 text-3xl font-bold text-slate-100 md:text-4xl", children: "Start a New Chat" }), _jsx("p", { className: "mb-7 text-sm text-slate-300 md:text-base", children: "Launch a regular conversation instantly, then attach a CSV or Google Sheet anytime to switch into data analysis mode." }), _jsx("button", { onClick: createThread, disabled: isCreating, className: "rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50", children: isCreating ? 'Creating...' : 'New Chat' })] }) })) })] }), _jsx(DataQueryModal, { isOpen: showDataQueryModal, onClose: () => setShowDataQueryModal(false) }), _jsx(ResearchDigestPanel, { isOpen: showResearchDigestPanel, onClose: () => setShowResearchDigestPanel(false) }), _jsx(TicTacToePanel, { isOpen: showTicTacToe, onClose: () => setShowTicTacToe(false) }), _jsx(ContractAnalysisPanel, { isOpen: showContractAnalysisPanel, onClose: () => setShowContractAnalysisPanel(false) })] }));
}
// Memoize to prevent unnecessary re-renders
const AppWithAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
        return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ChatApp, {}) }));
    }
    return (_jsx(GoogleOAuthProvider, { clientId: GOOGLE_CLIENT_ID, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(ChatApp, {}) }) }));
};
export default function App() {
    return _jsx(AppWithAuth, {});
}
//# sourceMappingURL=App.js.map