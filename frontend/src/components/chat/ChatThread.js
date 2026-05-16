import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Main chat thread component.
 */
import { useEffect, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { CsvOrSheetSourceInput } from './CsvOrSheetSourceInput';
export function ChatThread({ threadId }) {
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [isSettingContext, setIsSettingContext] = useState(false);
    const [showAttachContext, setShowAttachContext] = useState(false);
    const [density, setDensity] = useState('cozy');
    const skipMessageUpdateRef = useRef(false); // Prevent useEffect from overwriting during attachment upload
    // Fetch thread with messages
    const { data: thread, isLoading: isThreadLoading, refetch: refetchThread } = useQuery({
        queryKey: ['thread', threadId],
        queryFn: () => apiClient.get(`/chat/threads/${threadId}`),
        refetchInterval: false,
    });
    // Helper function to deduplicate messages by ID
    const deduplicateMessages = (msgs) => {
        const seen = new Set();
        return msgs.filter((msg) => {
            if (seen.has(msg.id)) {
                console.log('[ChatThread] Filtering duplicate message:', msg.id);
                return false;
            }
            seen.add(msg.id);
            return true;
        });
    };
    // Update messages when thread data changes - watch thread.messages directly
    useEffect(() => {
        if (skipMessageUpdateRef.current) {
            return;
        }
        if (!thread?.messages) {
            return;
        }
        // Sort messages
        const sorted = [...thread.messages].sort((a, b) => {
            const aTime = new Date(a.created_at).getTime();
            const bTime = new Date(b.created_at).getTime();
            return aTime - bTime;
        });
        // Update if different
        const currentIds = JSON.stringify(messages.map(m => m.id));
        const newIds = JSON.stringify(sorted.map(m => m.id));
        if (currentIds !== newIds) {
            console.log('[ChatThread-useEffect] Messages changed, updating from', messages.length, 'to', sorted.length);
            setMessages(sorted);
        }
        if (thread?.title) {
            setEditTitle(thread.title);
        }
    }, [thread?.messages]); // Watch the messages array directly
    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: (content) => apiClient.post(`/chat/threads/${threadId}/messages`, { content }),
        onSuccess: (response) => {
            // Replace messages: keep existing ones and add new response messages
            setMessages((prev) => {
                const updated = [...prev, response.user_message, response.assistant_message];
                // Deduplicate and sort
                const deduped = deduplicateMessages(updated);
                return deduped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
            setIsLoading(false);
        },
        onError: () => {
            setIsLoading(false);
            alert('Failed to send message. Please try again.');
        },
    });
    // Image generation mutation
    const imageGenerationMutation = useMutation({
        mutationFn: async ({ prompt, size, quality, n }) => {
            return apiClient.generateImage(threadId, prompt, size, quality, n);
        },
        onSuccess: async () => {
            // Refetch thread to get updated messages with generated images
            await refetchThread();
            setIsGeneratingImage(false);
        },
        onError: () => {
            setIsGeneratingImage(false);
            alert('Failed to generate image. Please try again.');
        },
    });
    const handleGenerateImage = async (prompt, size, quality) => {
        setIsGeneratingImage(true);
        try {
            await imageGenerationMutation.mutateAsync({ prompt, size, quality, n: 1 });
        }
        catch (error) {
            console.error('Image generation failed:', error);
        }
    };
    // Update thread title mutation
    const updateTitleMutation = useMutation({
        mutationFn: (title) => apiClient.updateThreadTitle(threadId, title),
        onSuccess: () => {
            setIsEditingTitle(false);
            refetchThread();
            // Also invalidate the threads list in sidebar so it reflects the new title
            queryClient.invalidateQueries({ queryKey: ['threads'] });
        },
        onError: () => {
            alert('Failed to update title. Please try again.');
            setIsEditingTitle(false);
        },
    });
    const handleSendMessage = async (content, attachments) => {
        try {
            if (attachments && attachments.length > 0) {
                // FLOW FOR ATTACHMENTS: Save message → Upload files → Generate response with attachments
                const tempUserMessage = {
                    id: `temp-${Date.now()}`,
                    role: 'user',
                    content: content,
                    created_at: new Date().toISOString(),
                    attachments: [],
                };
                setMessages((prev) => {
                    const updated = [...prev, tempUserMessage];
                    return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                });
                setIsLoading(true);
                // Step 1: Send message text to backend (just save, don't generate response yet)
                const saveResponse = await apiClient.post(`/chat/threads/${threadId}/messages`, { content });
                const userMessageId = saveResponse.user_message.id;
                console.log('[ChatThread] User message saved with ID:', userMessageId);
                // Show ONLY user message in UI (no response yet)
                setMessages((prev) => {
                    const updated = [...prev.slice(0, -1), saveResponse.user_message];
                    const deduped = deduplicateMessages(updated);
                    return deduped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                });
                // Step 2: Upload all files to this message
                const uploadErrors = [];
                for (const file of attachments) {
                    try {
                        console.log(`[ChatThread] Uploading file: ${file.name}, size: ${file.size} bytes`);
                        await apiClient.uploadFile(`/chat/messages/${userMessageId}/attachments`, file);
                        console.log(`[ChatThread] Successfully uploaded: ${file.name}`);
                    }
                    catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        console.error(`[ChatThread] Failed to upload ${file.name}:`, errorMsg);
                        uploadErrors.push(`${file.name}: ${errorMsg}`);
                    }
                }
                // Step 3: Refresh thread to get the user message WITH attachments
                skipMessageUpdateRef.current = true;
                console.log('[ChatThread] Refreshing thread to load attachments...');
                const threadData = await apiClient.get(`/chat/threads/${threadId}`);
                skipMessageUpdateRef.current = false;
                // Step 4: Update the user message with attachment data
                if (threadData?.messages) {
                    const userMsgWithAttachments = threadData.messages.find((m) => m.id === userMessageId);
                    if (userMsgWithAttachments) {
                        console.log('[ChatThread] Found user message with attachments:', userMsgWithAttachments.attachments?.length || 0);
                        setMessages((prev) => {
                            const updated = prev.map((msg) => msg.id === userMessageId ? userMsgWithAttachments : msg);
                            const deduped = deduplicateMessages(updated);
                            return deduped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        });
                    }
                }
                // Step 5: Generate LLM response NOW (with attachments visible to the model)
                console.log('[ChatThread] Generating response with attachments...');
                try {
                    const assistantMessage = await apiClient.post(`/chat/threads/${threadId}/messages/${userMessageId}/respond`, {});
                    console.log('[ChatThread] Response generated');
                    setMessages((prev) => {
                        const updated = [...prev, assistantMessage];
                        const deduped = deduplicateMessages(updated);
                        return deduped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    });
                }
                catch (error) {
                    console.error('[ChatThread] Failed to generate response:', error);
                    const errorMsg = error instanceof Error ? error.message : 'Failed to generate response';
                    alert(`Error generating response: ${errorMsg}`);
                }
                setIsLoading(false);
                // Show upload errors if any
                if (uploadErrors.length > 0) {
                    alert(`Failed to upload ${uploadErrors.length} file(s):\n${uploadErrors.join('\n')}`);
                }
            }
            else {
                // NO ATTACHMENTS: Use original flow (send message and get response immediately)
                setIsLoading(true);
                sendMessageMutation.mutate(content);
            }
        }
        catch (error) {
            console.error('[ChatThread] Error in handleSendMessage:', error);
            skipMessageUpdateRef.current = false;
            setIsLoading(false);
        }
    };
    const handleSaveTitle = () => {
        const trimmedTitle = editTitle.trim();
        if (trimmedTitle && trimmedTitle !== thread?.title) {
            updateTitleMutation.mutate(trimmedTitle);
        }
        else {
            setIsEditingTitle(false);
        }
    };
    const handleCancelEdit = () => {
        setEditTitle(thread?.title || '');
        setIsEditingTitle(false);
    };
    const handleSetThreadContext = async (payload) => {
        setIsSettingContext(true);
        try {
            if (payload.type === 'file') {
                await apiClient.setThreadContextFromCsv(threadId, payload.file);
            }
            else {
                await apiClient.setThreadContextFromSheetsUrl(threadId, payload.url);
            }
            await refetchThread();
            queryClient.invalidateQueries({ queryKey: ['threads'] });
            setShowAttachContext(false);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to set thread context';
            alert(message);
        }
        finally {
            setIsSettingContext(false);
        }
    };
    if (isThreadLoading && messages.length === 0) {
        return (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Loading thread..." }) }));
    }
    return (_jsxs("div", { className: "flex h-full w-full min-w-0 flex-1 flex-col bg-transparent", children: [_jsx("div", { className: "flex items-center justify-between border-b border-slate-700/70 bg-slate-900/70 px-3 py-3 text-slate-100 backdrop-blur sm:px-4", children: isEditingTitle ? (_jsxs("div", { className: "flex flex-1 items-center gap-2", children: [_jsx("input", { type: "text", value: editTitle, onChange: (e) => setEditTitle(e.target.value), placeholder: "Enter conversation title", className: "flex-1 rounded bg-slate-800 px-2 py-1 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400", autoFocus: true }), _jsx("button", { onClick: handleSaveTitle, disabled: updateTitleMutation.isPending, className: "rounded bg-emerald-500 px-3 py-1 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50", children: "Save" }), _jsx("button", { onClick: handleCancelEdit, disabled: updateTitleMutation.isPending, className: "rounded bg-rose-500 px-3 py-1 text-sm font-semibold hover:bg-rose-600 disabled:opacity-50", children: "Cancel" })] })) : (_jsxs("div", { className: "flex w-full items-center justify-between gap-2", children: [_jsx("h2", { className: "truncate text-sm font-semibold sm:text-base lg:text-lg xl:text-xl", children: thread?.title || 'Untitled Conversation' }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "hidden items-center rounded-lg border border-slate-600 bg-slate-800 p-1 sm:flex", children: [_jsx("button", { type: "button", onClick: () => setDensity('compact'), className: `rounded px-2 py-1 text-xs font-semibold transition ${density === 'compact'
                                                ? 'bg-cyan-500/30 text-cyan-100'
                                                : 'text-slate-300 hover:bg-slate-700'}`, children: "Compact" }), _jsx("button", { type: "button", onClick: () => setDensity('cozy'), className: `rounded px-2 py-1 text-xs font-semibold transition ${density === 'cozy'
                                                ? 'bg-cyan-500/30 text-cyan-100'
                                                : 'text-slate-300 hover:bg-slate-700'}`, children: "Cozy" })] }), _jsx("button", { onClick: () => setIsEditingTitle(true), className: "rounded border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25 sm:text-sm", title: "Rename conversation", children: "\u270F\uFE0F Rename" })] })] })) }), _jsxs("div", { className: "relative flex min-h-0 flex-1 flex-col", children: [_jsx(MessageList, { messages: messages, isLoading: isLoading, isGeneratingImage: isGeneratingImage, density: density }), _jsx("div", { className: "border-t border-slate-700/70 px-2 py-3 sm:px-4", children: _jsxs("div", { className: "w-full", children: [thread?.context_locked && thread.context_label ? (_jsxs("div", { className: "mb-3 inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200", children: ["Data Context: ", thread.context_label] })) : (_jsxs("div", { className: "mb-3", children: [_jsx("button", { type: "button", onClick: () => setShowAttachContext((prev) => !prev), className: "rounded-lg border border-cyan-500/40 px-3 py-1.5 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/15", children: "+ Add Data" }), showAttachContext && (_jsx("div", { className: "mt-3 rounded-xl border border-slate-700 bg-slate-800/60 p-3", children: _jsx(CsvOrSheetSourceInput, { isSubmitting: isSettingContext, onSubmit: handleSetThreadContext }) }))] })), _jsx(ChatInput, { isLoading: isLoading || isSettingContext, threadId: threadId, onSend: handleSendMessage, onGenerateImage: handleGenerateImage })] }) })] })] }));
}
//# sourceMappingURL=ChatThread.js.map