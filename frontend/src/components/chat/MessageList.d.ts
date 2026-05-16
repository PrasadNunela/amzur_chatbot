/**
 * Chat message list component.
 */
import { Message } from '../../types/chat';
interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    isGeneratingImage?: boolean;
    density?: 'compact' | 'cozy';
}
export declare function MessageList({ messages, isLoading, isGeneratingImage, density }: MessageListProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MessageList.d.ts.map