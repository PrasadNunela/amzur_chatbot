import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Chat message list component.
 */
import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';
export function MessageList({ messages, isLoading, isGeneratingImage, density = 'cozy' }) {
    const messagesEndRef = useRef(null);
    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isGeneratingImage]);
    return (_jsx("div", { className: "flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-7", children: _jsxs("div", { className: `w-full ${density === 'compact' ? 'space-y-2' : 'space-y-3'}`, children: [messages.length === 0 ? (_jsx("div", { className: "flex h-full min-h-[300px] items-center justify-center text-slate-300", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "mb-2 text-xs uppercase tracking-[0.3em] text-cyan-300", children: "Ready" }), _jsx("p", { className: "mb-2 text-lg font-semibold", children: "Start a conversation" }), _jsx("p", { className: "text-sm text-slate-400", children: "Ask anything, then add context whenever you need data-grounded answers." })] }) })) : (_jsxs(_Fragment, { children: [messages.map((message) => (_jsx(ChatMessage, { message: message, density: density }, message.id))), isGeneratingImage && (_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3", children: _jsx(LoadingSpinner, { size: "sm", text: "Generating image..." }) }) })), isLoading && (_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: "rounded-xl border border-slate-600 bg-slate-800 px-4 py-2", children: _jsxs("div", { className: "flex gap-1", children: [_jsx("div", { className: "h-2 w-2 animate-bounce rounded-full bg-cyan-400" }), _jsx("div", { className: "h-2 w-2 animate-bounce rounded-full bg-cyan-400 delay-100" }), _jsx("div", { className: "h-2 w-2 animate-bounce rounded-full bg-cyan-400 delay-200" })] }) }) }))] })), _jsx("div", { ref: messagesEndRef })] }) }));
}
//# sourceMappingURL=MessageList.js.map