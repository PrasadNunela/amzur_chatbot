/**
 * Shared types for chat functionality.
 */
export interface Attachment {
    id: string;
    filename: string;
    file_path: string;
    mime_type: string;
    file_size: string | number;
    file_type: 'image' | 'video' | 'code' | 'document' | 'table';
    created_at: string;
}
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    attachments?: Attachment[];
}
export interface Thread {
    id: string;
    title: string | null;
    thread_mode: 'general' | 'data_analysis';
    thread_type?: 'general' | 'data_analysis';
    context_type: 'csv' | 'google_sheets' | null;
    context_source: string | null;
    file_context_url?: string | null;
    context_label: string | null;
    context_locked: boolean;
    created_at: string;
    updated_at: string;
}
export interface ThreadDetail extends Thread {
    messages: Message[];
}
export interface ChatMessage {
    content: string;
}
export interface ChatResponseSchema {
    user_message: Message;
    assistant_message: Message;
    thread_id: string;
}
export interface ContractClause {
    category: string;
    clause_title: string;
    description: string;
    source_excerpt: string;
}
export interface ContractRisk {
    title: string;
    severity: 'low' | 'medium' | 'high' | string;
    description: string;
    clause_reference: string;
    recommendation: string;
}
export interface ContractSummary {
    executive_summary: string;
    key_terms: string[];
}
export interface ContractDataExtraction {
    party_names: string[];
    effective_date: string | null;
    expiration_date: string | null;
    governing_law: string | null;
    contract_value: string | null;
    renewal_terms: string | null;
    payment_terms: string | null;
    notice_period: string | null;
}
export interface ContractAnalysisReport {
    filename: string;
    summary: ContractSummary;
    clauses: ContractClause[];
    risks: ContractRisk[];
    extracted_data: ContractDataExtraction;
    analyzed_at: string;
}
export interface SavedContractAnalysisListItem {
    id: string;
    filename: string;
    created_at: string;
    analyzed_at: string;
    uploaded_filename: string | null;
}
export interface SavedContractAnalysis {
    id: string;
    filename: string;
    created_at: string;
    uploaded_filename: string | null;
    report: ContractAnalysisReport;
}
//# sourceMappingURL=chat.d.ts.map