import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Chat input component for sending messages with attachments.
 */
import { useState } from 'react';
import { AttachmentInput } from '../attachments/AttachmentInput';
import { ImageGenerationModal } from './ImageGenerationModal';
export function ChatInput({ isLoading, threadId, onSend, onGenerateImage }) {
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const removeAttachment = (index) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };
    const handleAddFiles = (files) => {
        setAttachments((prev) => [...prev, ...files]);
    };
    const handleGenerateImage = async (prompt, size, quality) => {
        if (!onGenerateImage) {
            alert('Image generation not available');
            return;
        }
        setIsGeneratingImage(true);
        try {
            await onGenerateImage(prompt, size, quality);
            setShowImageModal(false);
        }
        catch (error) {
            console.error('Image generation failed:', error);
            alert('Failed to generate image');
        }
        finally {
            setIsGeneratingImage(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if ((message.trim() || attachments.length > 0) && !isLoading) {
            await onSend(message.trim(), attachments.length > 0 ? attachments : undefined);
            setMessage('');
            setAttachments([]);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("form", { onSubmit: handleSubmit, className: "space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-2.5 sm:p-3", children: [attachments.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 border-b border-slate-700 pb-2", children: attachments.map((file, index) => (_jsxs("div", { className: "group flex items-center gap-2 rounded-lg bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100", children: [_jsx("span", { className: "truncate max-w-xs", children: file.name }), _jsxs("span", { className: "text-xs text-cyan-300/80", children: ["(", file.size < 1024 * 1024 ? (file.size / 1024).toFixed(1) + ' KB' : (file.size / 1024 / 1024).toFixed(1) + ' MB', ")"] }), _jsx("button", { type: "button", onClick: () => removeAttachment(index), className: "font-bold text-rose-300 opacity-0 transition-opacity hover:text-rose-200 group-hover:opacity-100", title: "Remove attachment", children: "\u2715" })] }, index))) })), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-end", children: [_jsx("textarea", { value: message, onChange: (e) => setMessage(e.target.value), placeholder: "Message your workspace...", disabled: isLoading || isGeneratingImage, rows: 1, className: "min-h-[44px] max-h-44 w-full flex-1 resize-y rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50", onKeyDown: (e) => {
                                    // Allow Ctrl+Enter or Cmd+Enter to send
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                        handleSubmit(e);
                                    }
                                } }), _jsxs("div", { className: "flex w-full shrink-0 items-center gap-2 self-end sm:w-auto sm:self-auto", children: [_jsx(AttachmentInput, { onFilesSelected: handleAddFiles, disabled: isLoading || isGeneratingImage }), _jsx("button", { type: "button", onClick: () => setShowImageModal(true), disabled: isLoading || isGeneratingImage || !threadId, className: "rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 font-semibold text-amber-100 transition-colors hover:bg-amber-500/25 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50", title: "Generate image with AI", children: "\uD83C\uDFA8" }), _jsx("button", { type: "submit", disabled: isLoading || isGeneratingImage || (!message.trim() && attachments.length === 0), className: "ml-auto rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-white hover:from-cyan-400 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors sm:ml-0", children: isLoading ? 'Sending...' : 'Send' })] })] })] }), _jsx(ImageGenerationModal, { isOpen: showImageModal, isLoading: isGeneratingImage, onClose: () => setShowImageModal(false), onGenerate: handleGenerateImage })] }));
}
//# sourceMappingURL=ChatInput.js.map