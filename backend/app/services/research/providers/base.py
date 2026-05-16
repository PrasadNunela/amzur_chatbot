"""Provider interface for research paper search backends."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class PaperRecord:
    """Normalized research paper record used by the digest agent."""

    paper_id: str
    title: str
    summary: str
    authors: list[str]
    published: str
    url: str


class ResearchProvider(Protocol):
    """Provider abstraction so native arxiv can be swapped with MCP."""

    def search(self, query: str, max_results: int = 8) -> list[PaperRecord]:
        """Return normalized papers for a query."""
        ...
