import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
const GOOGLE_SHEETS_URL_PATTERN = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/i;
export function CsvOrSheetSourceInput({ isSubmitting, onSubmit }) {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [sheetsUrl, setSheetsUrl] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const trimmedUrl = sheetsUrl.trim();
    const hasUrl = trimmedUrl.length > 0;
    const isUrlValid = !hasUrl || GOOGLE_SHEETS_URL_PATTERN.test(trimmedUrl);
    const isSubmitDisabled = isSubmitting ||
        (!selectedFile && !hasUrl) ||
        (!selectedFile && hasUrl && !isUrlValid);
    const setFileIfValid = (file) => {
        if (!file) {
            setSelectedFile(null);
            return;
        }
        const isCsv = file.name.toLowerCase().endsWith('.csv') ||
            file.type === 'text/csv' ||
            file.type === 'application/vnd.ms-excel';
        if (!isCsv) {
            setValidationError('Only .csv files are allowed.');
            setSelectedFile(null);
            return;
        }
        setValidationError(null);
        setSelectedFile(file);
    };
    const openFileDialog = () => {
        fileInputRef.current?.click();
    };
    const handleFileChange = (event) => {
        const file = event.target.files?.[0] ?? null;
        setFileIfValid(file);
    };
    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        const file = event.dataTransfer.files?.[0] ?? null;
        setFileIfValid(file);
    };
    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(true);
    };
    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
    };
    const handleDropZoneKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFileDialog();
        }
    };
    const handleSubmit = async () => {
        setValidationError(null);
        if (selectedFile) {
            await onSubmit({ type: 'file', file: selectedFile });
            return;
        }
        if (hasUrl && isUrlValid) {
            await onSubmit({ type: 'url', url: trimmedUrl });
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "mb-2 text-sm font-medium text-slate-200", children: "Upload CSV file" }), _jsxs("div", { role: "button", tabIndex: 0, onClick: openFileDialog, onKeyDown: handleDropZoneKeyDown, onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave, "aria-label": "Upload CSV file by dragging and dropping or browsing", className: `cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${dragActive
                            ? 'border-cyan-400 bg-cyan-500/10'
                            : 'border-slate-500 hover:border-cyan-400'}`, children: [_jsx("p", { className: "text-sm text-slate-200", children: "Drag and drop a .csv file here, or click to browse" }), selectedFile && (_jsxs("p", { className: "mt-2 rounded bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-200", children: ["Selected file: ", selectedFile.name] }))] }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".csv,text/csv", className: "hidden", onChange: handleFileChange, disabled: isSubmitting })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "google-sheets-url", className: "mb-1 block text-sm font-medium text-slate-200", children: "or paste Google Sheets URL" }), _jsx("input", { id: "google-sheets-url", type: "url", value: sheetsUrl, onChange: (event) => setSheetsUrl(event.target.value), placeholder: "https://docs.google.com/spreadsheets/d/...", disabled: isSubmitting, className: `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none dark:bg-gray-700 dark:text-white ${hasUrl && !isUrlValid
                            ? 'border-rose-400 bg-slate-900 text-slate-100 focus:border-rose-400'
                            : 'border-slate-500 bg-slate-900 text-slate-100 focus:border-cyan-400'}` }), hasUrl && !isUrlValid && (_jsx("p", { className: "mt-1 text-xs text-rose-300", children: "Enter a valid Google Sheets URL." }))] }), validationError && (_jsx("p", { className: "text-sm text-rose-300", children: validationError })), _jsx("button", { type: "button", onClick: handleSubmit, disabled: isSubmitDisabled, className: "rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50", children: isSubmitting ? 'Submitting...' : 'Submit' })] }));
}
//# sourceMappingURL=CsvOrSheetSourceInput.js.map