"""MCP-ready arXiv provider implementation (mcp_simple_arxiv compatible)."""

from __future__ import annotations

from typing import Any

import httpx

from app.services.research.providers.base import PaperRecord


class MCPArxivProvider:
    """Call an MCP server exposing arXiv search capability."""

    def __init__(self, endpoint: str) -> None:
        self.endpoint = endpoint.rstrip("/")

    def search(self, query: str, max_results: int = 8) -> list[PaperRecord]:
        """
        Expected MCP bridge contract (example):
        POST {endpoint}/search
        {
          "tool": "mcp_simple_arxiv.search",
          "input": {"query": "...", "max_results": 8}
        }
        """
        payload = {
            "tool": "mcp_simple_arxiv.search",
            "input": {"query": query, "max_results": max_results},
        }

        response = httpx.post(
            f"{self.endpoint}/search",
            json=payload,
            timeout=20,
        )
        response.raise_for_status()
        data: dict[str, Any] = response.json()

        raw_items = data.get("papers") or data.get("results") or []
        papers: list[PaperRecord] = []
        for item in raw_items:
            papers.append(
                PaperRecord(
                    paper_id=str(item.get("id") or item.get("paper_id") or item.get("url") or ""),
                    title=str(item.get("title") or "").strip(),
                    summary=str(item.get("summary") or item.get("abstract") or "").strip(),
                    authors=[str(a) for a in (item.get("authors") or [])],
                    published=str(item.get("published") or item.get("date") or ""),
                    url=str(item.get("url") or item.get("pdf_url") or ""),
                )
            )

        return papers
