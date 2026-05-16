/**
 * Image generation modal component.
 */
interface ImageGenerationModalProps {
    isOpen: boolean;
    isLoading: boolean;
    onClose: () => void;
    onGenerate: (prompt: string, size: string, quality: string) => Promise<void>;
}
export declare function ImageGenerationModal({ isOpen, isLoading, onClose, onGenerate }: ImageGenerationModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=ImageGenerationModal.d.ts.map