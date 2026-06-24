import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/api';
const ACCEPTED_TYPES = '.pdf,.docx';
export function ContractAnalysisPanel({ isOpen, onClose }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);
    const [error, setError] = useState(null);
    const [report, setReport] = useState(null);
    const [savedReports, setSavedReports] = useState([]);
    const [activeSavedReportId, setActiveSavedReportId] = useState(null);
    const extractedDataRows = useMemo(() => {
        if (!report) {
            return [];
        }
        const data = report.extracted_data;
        return [
            { label: 'Party Names', value: data.party_names.join(', ') || 'Not found' },
            { label: 'Effective Date', value: data.effective_date || 'Not found' },
            { label: 'Expiration Date', value: data.expiration_date || 'Not found' },
            { label: 'Governing Law', value: data.governing_law || 'Not found' },
            { label: 'Contract Value', value: data.contract_value || 'Not found' },
            { label: 'Renewal Terms', value: data.renewal_terms || 'Not found' },
            { label: 'Payment Terms', value: data.payment_terms || 'Not found' },
            { label: 'Notice Period', value: data.notice_period || 'Not found' },
        ];
    }, [report]);
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const fetchSavedReports = async () => {
            setIsLoadingSaved(true);
            try {
                const items = await apiClient.listSavedContractReports();
                setSavedReports(items);
            }
            catch (loadError) {
                const message = loadError instanceof Error ? loadError.message : 'Failed to load saved reports';
                setError(message);
            }
            finally {
                setIsLoadingSaved(false);
            }
        };
        fetchSavedReports();
    }, [isOpen]);
    if (!isOpen) {
        return null;
    }
    const loadSavedReports = async () => {
        setIsLoadingSaved(true);
        try {
            const items = await apiClient.listSavedContractReports();
            setSavedReports(items);
        }
        catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to load saved reports';
            setError(message);
        }
        finally {
            setIsLoadingSaved(false);
        }
    };
    const handleSaveCurrentReport = async () => {
        if (!report) {
            setError('No generated report is available to save.');
            return;
        }
        setError(null);
        setIsSaving(true);
        try {
            const saved = selectedFile
                ? await apiClient.saveContractReportWithFile(report, selectedFile)
                : await apiClient.saveContractReport(report);
            setActiveSavedReportId(saved.id);
            await loadSavedReports();
        }
        catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Failed to save report';
            setError(message);
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleDownloadSavedFile = async (reportId, uploadedFilename) => {
        setError(null);
        try {
            const blob = await apiClient.downloadSavedContractReportFile(reportId);
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = uploadedFilename || 'contract-file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
        }
        catch (downloadError) {
            const message = downloadError instanceof Error ? downloadError.message : 'Failed to download saved file';
            setError(message);
        }
    };
    const handleOpenSavedReport = async (reportId) => {
        setError(null);
        setIsLoadingSaved(true);
        try {
            const saved = await apiClient.getSavedContractReport(reportId);
            setReport(saved.report);
            setActiveSavedReportId(saved.id);
        }
        catch (openError) {
            const message = openError instanceof Error ? openError.message : 'Failed to open saved report';
            setError(message);
        }
        finally {
            setIsLoadingSaved(false);
        }
    };
    const handleDeleteSavedReport = async (reportId) => {
        setError(null);
        try {
            await apiClient.deleteSavedContractReport(reportId);
            if (activeSavedReportId === reportId) {
                setActiveSavedReportId(null);
            }
            await loadSavedReports();
        }
        catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete saved report';
            setError(message);
        }
    };
    const handleAnalyze = async () => {
        setError(null);
        setReport(null);
        if (!selectedFile) {
            setError('Please choose a PDF or DOCX file before analyzing.');
            return;
        }
        const lower = selectedFile.name.toLowerCase();
        if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
            setError('Only PDF and DOCX files are supported.');
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await apiClient.analyzeContract(selectedFile);
            setReport(result);
        }
        catch (analyzeError) {
            const message = analyzeError instanceof Error ? analyzeError.message : 'Analysis failed';
            setError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const severityClass = (severity) => {
        const normalized = severity.toLowerCase();
        if (normalized === 'high')
            return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
        if (normalized === 'medium')
            return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4", children: _jsxs("div", { className: "h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-700 px-5 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: "Contract Analysis Tool" }), _jsx("p", { className: "text-xs text-slate-400", children: "Clause identification, risk analysis, summarization, and data extraction" })] }), _jsx("button", { onClick: onClose, className: "rounded-lg border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800", children: "Close" })] }), _jsxs("div", { className: "grid h-[calc(92vh-73px)] grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[360px_1fr]", children: [_jsxs("div", { className: "flex flex-col gap-3 overflow-auto rounded-xl border border-slate-700 bg-slate-950/60 p-3", children: [_jsx("label", { className: "text-xs uppercase tracking-wider text-slate-400", children: "Upload Contract" }), _jsx("input", { type: "file", accept: ACCEPTED_TYPES, onChange: (event) => setSelectedFile(event.target.files?.[0] || null), className: "rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-950" }), _jsx("button", { type: "button", onClick: handleAnalyze, disabled: isSubmitting, className: "rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50", children: isSubmitting ? 'Analyzing...' : 'Run Analysis' }), _jsx("button", { type: "button", onClick: handleSaveCurrentReport, disabled: isSaving || !report, className: "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50", children: isSaving ? 'Saving...' : 'Save Current Report' }), _jsxs("div", { className: "rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("p", { className: "font-semibold text-slate-300", children: "Saved Reports" }), _jsx("button", { type: "button", onClick: loadSavedReports, disabled: isLoadingSaved, className: "rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50", children: isLoadingSaved ? 'Loading...' : 'Refresh' })] }), savedReports.length === 0 ? (_jsx("p", { className: "text-slate-400", children: "No saved reports yet." })) : (_jsx("div", { className: "max-h-56 space-y-2 overflow-auto", children: savedReports.map((item) => (_jsxs("div", { className: `rounded border p-2 ${activeSavedReportId === item.id
                                                    ? 'border-cyan-500/50 bg-cyan-500/10'
                                                    : 'border-slate-700 bg-slate-950/70'}`, children: [_jsx("p", { className: "truncate text-[11px] text-slate-200", title: item.filename, children: item.filename }), _jsxs("p", { className: "mt-1 text-[10px] text-slate-400", children: ["Saved: ", new Date(item.created_at).toLocaleString()] }), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx("button", { type: "button", onClick: () => handleOpenSavedReport(item.id), className: "rounded border border-cyan-500/40 px-2 py-1 text-[10px] text-cyan-200", children: "View" }), item.uploaded_filename && (_jsx("button", { type: "button", onClick: () => handleDownloadSavedFile(item.id, item.uploaded_filename), className: "rounded border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200", children: "File" })), _jsx("button", { type: "button", onClick: () => handleDeleteSavedReport(item.id), className: "rounded border border-rose-500/40 px-2 py-1 text-[10px] text-rose-200", children: "Delete" })] })] }, item.id))) }))] }), _jsxs("div", { className: "rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs", children: [_jsx("p", { className: "mb-1 font-semibold text-slate-300", children: "Workflow" }), _jsx("p", { className: "text-slate-400", children: "Parallel engines run clause identification, risk analysis, and key data extraction. A summarizer compiles the final report." })] }), error && (_jsx("div", { className: "rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200", children: error }))] }), _jsxs("div", { className: "flex min-h-0 flex-col gap-3 overflow-auto rounded-xl border border-slate-700 bg-slate-950/60 p-4", children: [!report && !isSubmitting && (_jsx("div", { className: "rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300", children: "Upload a legal contract in PDF or DOCX format and run analysis to generate a structured report." })), report && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-cyan-200", children: "Summary" }), _jsx("p", { className: "mt-2 text-sm leading-relaxed text-slate-100", children: report.summary.executive_summary }), report.summary.key_terms.length > 0 && (_jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: report.summary.key_terms.map((term, index) => (_jsx("span", { className: "rounded-full border border-cyan-400/40 px-2 py-1 text-xs text-cyan-100", children: term }, `${term}-${index}`))) }))] }), _jsxs("div", { className: "rounded-xl border border-slate-700 bg-slate-900/80 p-4", children: [_jsx("p", { className: "mb-3 text-sm font-semibold text-slate-100", children: "Extracted Data Points" }), _jsx("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-2", children: extractedDataRows.map((row) => (_jsxs("div", { className: "rounded-lg border border-slate-700 bg-slate-950/70 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: row.label }), _jsx("p", { className: "mt-1 text-sm text-slate-100", children: row.value })] }, row.label))) })] }), _jsxs("div", { className: "rounded-xl border border-slate-700 bg-slate-900/80 p-4", children: [_jsx("p", { className: "mb-3 text-sm font-semibold text-slate-100", children: "Clause Identification" }), _jsxs("div", { className: "space-y-2", children: [report.clauses.length === 0 && (_jsx("p", { className: "text-sm text-slate-400", children: "No clauses were identified." })), report.clauses.map((clause, index) => (_jsxs("div", { className: "rounded-lg border border-slate-700 bg-slate-950/70 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-cyan-300", children: clause.category }), _jsx("p", { className: "mt-1 text-sm font-semibold text-slate-100", children: clause.clause_title }), _jsx("p", { className: "mt-1 text-sm text-slate-200", children: clause.description }), clause.source_excerpt && (_jsx("p", { className: "mt-2 rounded border border-slate-700 bg-slate-900/60 p-2 text-xs text-slate-300", children: clause.source_excerpt }))] }, `${clause.clause_title}-${index}`)))] })] }), _jsxs("div", { className: "rounded-xl border border-slate-700 bg-slate-900/80 p-4", children: [_jsx("p", { className: "mb-3 text-sm font-semibold text-slate-100", children: "Risk Analysis" }), _jsxs("div", { className: "space-y-2", children: [report.risks.length === 0 && (_jsx("p", { className: "text-sm text-slate-400", children: "No material risks were identified." })), report.risks.map((risk, index) => (_jsxs("div", { className: `rounded-lg border p-3 ${severityClass(risk.severity)}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-sm font-semibold", children: risk.title }), _jsx("span", { className: "rounded-full border border-current px-2 py-0.5 text-xs uppercase tracking-wide", children: risk.severity })] }), _jsx("p", { className: "mt-1 text-sm", children: risk.description }), risk.clause_reference && _jsxs("p", { className: "mt-1 text-xs", children: ["Clause: ", risk.clause_reference] }), risk.recommendation && _jsxs("p", { className: "mt-1 text-xs", children: ["Recommendation: ", risk.recommendation] })] }, `${risk.title}-${index}`)))] })] })] }))] })] })] }) }));
}
//# sourceMappingURL=ContractAnalysisPanel.js.map