"""Native arXiv provider implementation."""

from __future__ import annotations

from datetime import datetime

import arxiv

from app.services.research.providers.base import PaperRecord


class ArxivNativeProvider:
    """Search arXiv via the official python arxiv client."""

    def search(self, query: str, max_results: int = 8) -> list[PaperRecord]:
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance,
        )

        papers: list[PaperRecord] = []
        for result in search.results():
            published = result.published
            if isinstance(published, datetime):
                published_str = published.strftime("%Y-%m-%d")
            else:
                published_str = str(published)

            papers.append(
                PaperRecord(
                    paper_id=result.entry_id,
                    title=(result.title or "").strip(),
                    summary=(result.summary or "").strip(),
                    authors=[a.name for a in (result.authors or [])],
                    published=published_str,
                    url=result.pdf_url or result.entry_id,
                )
            )

        return papers
