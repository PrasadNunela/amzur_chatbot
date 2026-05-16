/**
 * Thread sidebar for listing and creating conversations.
 */
interface ThreadSidebarProps {
    activeThreadId: string | null;
    onSelectThread: (threadId: string) => void;
    onCreateThread: () => void;
    isCreating?: boolean;
    isCollapsed: boolean;
    onToggleCollapsed: () => void;
}
export declare function ThreadSidebar({ activeThreadId, onSelectThread, onCreateThread, isCreating, isCollapsed, onToggleCollapsed, }: ThreadSidebarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ThreadSidebar.d.ts.map