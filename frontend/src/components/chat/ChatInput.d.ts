/**
 * Chat input component for sending messages with attachments.
 */
interface ChatInputProps {
    isLoading: boolean;
    threadId?: string;
    onSend: (message: string, attachments?: File[]) => Promise<void> | void;
    onGenerateImage?: (prompt: string, size: string, quality: string) => Promise<void>;
}
export declare function ChatInput({ isLoading, threadId, onSend, onGenerateImage }: ChatInputProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ChatInput.d.ts.map