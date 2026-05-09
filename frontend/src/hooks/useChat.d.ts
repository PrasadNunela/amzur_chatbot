/**
 * Custom hook for managing chat state.
 */
import { Thread } from '../types/chat';
export declare function useChat(): {
    activeThreadId: string | null;
    selectThread: (threadId: string) => void;
    createThread: () => void;
    threads: Thread[];
    isCreating: boolean;
    clearThreads: () => void;
};
//# sourceMappingURL=useChat.d.ts.map