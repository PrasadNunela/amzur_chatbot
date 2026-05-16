/**
 * Chat message component to display individual messages with attachments.
 */
import { Message } from '../../types/chat';
interface ChatMessageProps {
    message: Message;
    density?: 'compact' | 'cozy';
}
export declare function ChatMessage({ message, density }: ChatMessageProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ChatMessage.d.ts.map