"""Schemas for contract analysis requests and responses."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ContractClauseSchema(BaseModel):
    """Identified contract clause."""

    category: str = Field(..., description="Clause category, e.g., termination")
    clause_title: str = Field(..., description="Human-readable clause title")
    description: str = Field(..., description="What the clause says")
    source_excerpt: str = Field(default="", description="Supporting excerpt from the contract")


class ContractRiskSchema(BaseModel):
    """Potential contract risk."""

    title: str = Field(..., description="Short risk title")
    severity: str = Field(..., description="low | medium | high")
    description: str = Field(..., description="Why this is a risk")
    clause_reference: str = Field(default="", description="Related clause/category")
    recommendation: str = Field(default="", description="Suggested mitigation")


class ContractSummarySchema(BaseModel):
    """High-level contract summary output."""

    executive_summary: str = Field(..., description="Short high-level summary")
    key_terms: list[str] = Field(default_factory=list, description="Bullet-style key terms")


class ContractDataExtractionSchema(BaseModel):
    """Extracted structured contract data points."""

    party_names: list[str] = Field(default_factory=list)
    effective_date: str | None = None
    expiration_date: str | None = None
    governing_law: str | None = None
    contract_value: str | None = None
    renewal_terms: str | None = None
    payment_terms: str | None = None
    notice_period: str | None = None


class ContractAnalysisResponseSchema(BaseModel):
    """Full contract analysis report."""

    filename: str
    summary: ContractSummarySchema
    clauses: list[ContractClauseSchema]
    risks: list[ContractRiskSchema]
    extracted_data: ContractDataExtractionSchema
    analyzed_at: datetime


class ContractAnalysisSaveRequestSchema(BaseModel):
    """Request payload for persisting a generated analysis report."""

    report: ContractAnalysisResponseSchema


class SavedContractAnalysisListItemSchema(BaseModel):
    """List item schema for saved reports."""

    id: UUID
    filename: str
    created_at: datetime
    analyzed_at: datetime
    uploaded_filename: str | None = None


class SavedContractAnalysisSchema(BaseModel):
    """Full saved report record."""

    id: UUID
    filename: str
    created_at: datetime
    uploaded_filename: str | None = None
    report: ContractAnalysisResponseSchema
