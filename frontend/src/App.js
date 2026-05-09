import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useChat } from './hooks/useChat';
import { useAuth } from './hooks/useAuth';
import { ThreadSidebar } from './components/chat/ThreadSidebar';
import { ChatThread } from './components/chat/ChatThread';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import './App.css';
const queryClient = new QueryClient();
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
function ChatApp() {
    const { user, logout, register: authRegister, login: authLogin, googleLogin: authGoogleLogin } = useAuth();
    const { activeThreadId, selectThread, createThread, isCreating, clearThreads } = useChat();
    const [currentPage, setCurrentPage] = useState('login');
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
    return (_jsxs("div", { className: "flex h-screen bg-white dark:bg-gray-800", children: [_jsx(ThreadSidebar, { activeThreadId: activeThreadId, onSelectThread: selectThread, onCreateThread: createThread, isCreating: isCreating }), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsxs("div", { className: "border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 flex justify-between items-center", children: [_jsx("h1", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: user.full_name || user.email }), _jsx("button", { onClick: logout, className: "px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium", children: "Logout" })] }), activeThreadId ? (_jsx(ChatThread, { threadId: activeThreadId }, activeThreadId)) : (_jsx("div", { className: "flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900 dark:text-white mb-4", children: "Amzur AI Chat" }), _jsx("p", { className: "text-lg text-gray-600 dark:text-gray-400 mb-8", children: "Start a conversation by creating a new chat" }), _jsx("button", { onClick: createThread, disabled: isCreating, className: "px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold disabled:opacity-50", children: isCreating ? 'Creating...' : 'Create New Chat' })] }) }))] })] }));
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