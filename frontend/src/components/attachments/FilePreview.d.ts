/**
 * FilePreview component for displaying attachment previews with metadata.
 */
import { Attachment } from '../../types/chat';
interface FilePreviewProps {
    attachment: Attachment;
    className?: string;
}
export declare function FilePreview({ attachment, className }: FilePreviewProps): import("react/jsx-runtime").JSX.Element;
/**
 * FilePreviewGallery component for displaying multiple attachments.
 */
interface FilePreviewGalleryProps {
    attachments: Attachment[];
    className?: string;
}
export declare function FilePreviewGallery({ attachments, className }: FilePreviewGalleryProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=FilePreview.d.ts.map