/**
 * AttachmentInput component for selecting and managing file attachments.
 */
interface AttachmentInputProps {
    onFilesSelected: (files: File[]) => void;
    maxFileSize?: number;
    disabled?: boolean;
}
export declare function AttachmentInput({ onFilesSelected, maxFileSize, disabled }: AttachmentInputProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AttachmentInput.d.ts.map