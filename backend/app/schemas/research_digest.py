"""Schemas for research digest streaming."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ResearchDigestRequest(BaseModel):
    """Request model for research digest generation."""

    topic: str = Field(..., min_length=3, max_length=300)
    max_iterations: int = Field(default=4, ge=1, le=10)
    confidence_threshold: int = Field(default=7, ge=1, le=10)
    max_results_per_search: int = Field(default=8, ge=1, le=20)


class StreamEnvelope(BaseModel):
    """Structured stream event envelope."""

    type: str
    data: dict
