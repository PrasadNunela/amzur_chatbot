import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Get a file type icon/emoji based on the attachment type.
 */
function getFileIcon(fileType, mimeType) {
    if (fileType === 'image')
        return '🖼️';
    if (fileType === 'video')
        return '🎥';
    if (fileType === 'code')
        return '💻';
    if (fileType === 'document') {
        if (mimeType.includes('pdf'))
            return '📄';
        if (mimeType.includes('word') || mimeType.includes('document'))
            return '📝';
        if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
            return '📊';
        return '📋';
    }
    if (fileType === 'table')
        return '📊';
    return '📎';
}
/**
 * Format file size in human-readable format.
 */
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}
export function FilePreview({ attachment, className = '' }) {
    const icon = getFileIcon(attachment.file_type, attachment.mime_type);
    // Ensure file_size is converted to a number (backend stores as string)
    const fileSizeBytes = typeof attachment.file_size === 'string'
        ? parseInt(attachment.file_size, 10)
        : attachment.file_size;
    const fileSize = formatFileSize(fileSizeBytes || 0);
    return (_jsxs("div", { className: `flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${className}`, children: [_jsx("span", { className: "text-lg", children: icon }), _jsx("a", { href: `/api/chat/attachments/${attachment.id}`, download: attachment.filename, className: "flex-1 truncate text-blue-600 dark:text-blue-400 hover:underline", title: attachment.filename, children: attachment.filename }), _jsx("span", { className: "text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap", children: fileSize })] }));
}
export function FilePreviewGallery({ attachments, className = '' }) {
    if (attachments.length === 0)
        return null;
    // Separate attachments by type for better organization
    const images = attachments.filter((a) => a.file_type === 'image');
    const videos = attachments.filter((a) => a.file_type === 'video');
    const others = attachments.filter((a) => a.file_type !== 'image' && a.file_type !== 'video');
    return (_jsxs("div", { className: `mt-3 space-y-3 ${className}`, children: [images.length > 0 && (_jsx("div", { className: "grid grid-cols-2 gap-2 md:grid-cols-3", children: images.map((attachment) => (_jsxs("a", { href: `/api/chat/attachments/${attachment.id}`, target: "_blank", rel: "noopener noreferrer", className: "group relative overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600", title: attachment.filename, children: [_jsx("img", { src: `/api/chat/attachments/${attachment.id}`, alt: attachment.filename, className: "h-32 w-full object-cover group-hover:opacity-75 transition-opacity" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity", children: _jsx("span", { className: "text-white text-sm", children: "View" }) })] }, attachment.id))) })), videos.length > 0 && (_jsx("div", { className: "space-y-2", children: videos.map((attachment) => (_jsx("div", { className: "rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden", children: _jsxs("video", { controls: true, className: "w-full max-h-64 bg-black", children: [_jsx("source", { src: `/api/chat/attachments/${attachment.id}`, type: attachment.mime_type }), "Your browser does not support the video tag."] }) }, attachment.id))) })), others.length > 0 && (_jsx("div", { className: "space-y-2", children: others.map((attachment) => (_jsx(FilePreview, { attachment: attachment }, attachment.id))) }))] }));
}
//# sourceMappingURL=FilePreview.js.map