"""Provider factory for research search backends."""

from __future__ import annotations

from app.core.config import settings
from app.services.research.providers.arxiv_native import ArxivNativeProvider
from app.services.research.providers.base import ResearchProvider
from app.services.research.providers.mcp_arxiv import MCPArxivProvider


def build_research_provider() -> ResearchProvider:
    """Return active provider based on environment settings."""
    if settings.RESEARCH_PROVIDER == "mcp":
        endpoint = (settings.MCP_ARXIV_ENDPOINT or "").strip()
        if endpoint:
            return MCPArxivProvider(endpoint=endpoint)
    return ArxivNativeProvider()
