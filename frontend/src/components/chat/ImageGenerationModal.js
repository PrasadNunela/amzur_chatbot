import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Image generation modal component.
 */
import { useState } from 'react';
export function ImageGenerationModal({ isOpen, isLoading, onClose, onGenerate }) {
    const [prompt, setPrompt] = useState('');
    const [size, setSize] = useState('1024x1024');
    const [quality, setQuality] = useState('standard');
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (prompt.trim()) {
            try {
                await onGenerate(prompt, size, quality);
                setPrompt('');
            }
            catch (error) {
                console.error('Image generation failed:', error);
            }
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-lg", children: [_jsx("h2", { className: "text-xl font-bold mb-4 text-gray-900 dark:text-white", children: "Generate Image" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Prompt" }), _jsx("textarea", { value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "Describe the image you want to generate...", disabled: isLoading, maxLength: 1000, rows: 4, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50" }), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: [prompt.length, "/1000"] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Size" }), _jsxs("select", { value: size, onChange: (e) => setSize(e.target.value), disabled: isLoading, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50", children: [_jsx("option", { value: "1024x1024", children: "1024x1024 (Square)" }), _jsx("option", { value: "1024x1792", children: "1024x1792 (Portrait)" }), _jsx("option", { value: "1792x1024", children: "1792x1024 (Landscape)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Quality" }), _jsxs("select", { value: quality, onChange: (e) => setQuality(e.target.value), disabled: isLoading, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50", children: [_jsx("option", { value: "standard", children: "Standard" }), _jsx("option", { value: "hd", children: "HD" })] })] }), _jsxs("div", { className: "flex gap-2 pt-4", children: [_jsx("button", { type: "button", onClick: onClose, disabled: isLoading, className: "flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50", children: "Cancel" }), _jsx("button", { type: "submit", disabled: isLoading || !prompt.trim(), className: "flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50", children: isLoading ? 'Generating...' : 'Generate' })] })] })] }) }));
}
//# sourceMappingURL=ImageGenerationModal.js.map