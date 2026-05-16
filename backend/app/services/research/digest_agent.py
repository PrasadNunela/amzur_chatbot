"""Autonomous research digest agent with iterative evidence loop."""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass, field
from typing import Awaitable, Callable

from langchain_core.messages import HumanMessage, SystemMessage

from app.ai.llm import llm
from app.core.logger import logger
from app.services.research.providers.base import PaperRecord
from app.services.research.providers.factory import build_research_provider

EmitFn = Callable[[str, dict], Awaitable[None]]


@dataclass
class DigestState:
    """Mutable autonomous-loop state."""

    topic: str
    max_iterations: int
    confidence_threshold: int
    max_results_per_search: int
    iteration: int = 0
    confidence: int = 1
    evidence: list[PaperRecord] = field(default_factory=list)
    seen_ids: set[str] = field(default_factory=set)
    query_history: list[str] = field(default_factory=list)


class ResearchDigestAgent:
    """Runs search/analyze/decide loop and streams status + digest tokens."""

    SYSTEM_PLAN_PROMPT = (
        "You are an autonomous research planner. "
        "Given a research topic and prior search attempts, propose the next best arXiv search query. "
        "Return ONLY the query string, nothing else."
    )

    SYSTEM_SYNTHESIS_PROMPT = (
        "You are a senior research analyst. Build a structured digest from evidence papers. "
        "Format with sections: Executive Summary, Key Findings, Methods Trends, Notable Gaps, "
        "and Actionable Next Steps. Keep claims grounded in provided paper evidence only."
    )

    def __init__(self) -> None:
        self.provider = build_research_provider()

    @staticmethod
    def _keywords(text: str) -> set[str]:
        tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9\-]{2,}", text.lower())
        stop = {
            "the", "and", "for", "with", "from", "this", "that", "into", "using",
            "based", "study", "paper", "method", "results", "analysis", "model",
        }
        return {t for t in tokens if t not in stop}

    def _score_relevance(self, topic: str, paper: PaperRecord) -> float:
        topic_k = self._keywords(topic)
        text_k = self._keywords(f"{paper.title} {paper.summary}")
        if not topic_k or not text_k:
            return 0.0
        overlap = len(topic_k.intersection(text_k))
        return overlap / max(1, len(topic_k))

    async def _next_query(self, state: DigestState, user_email: str) -> str:
        if state.iteration == 0:
            return state.topic

        prompt = (
            f"Topic: {state.topic}\n"
            f"Past queries: {state.query_history}\n"
            f"Current evidence count: {len(state.evidence)}\n"
            "Propose next best query to improve evidence coverage."
        )
        model = llm()
        response = await asyncio.to_thread(
            model.invoke,
            [
                SystemMessage(content=self.SYSTEM_PLAN_PROMPT),
                HumanMessage(content=prompt),
            ],
            {"metadata": {"user_email": user_email}},
        )
        content = getattr(response, "content", "")
        if isinstance(content, list):
            content = " ".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in content
            )
        text = str(content).strip()
        return text or state.topic

    async def _search(self, query: str, max_results: int) -> list[PaperRecord]:
        return await asyncio.to_thread(self.provider.search, query, max_results)

    async def _stream_synthesis(
        self,
        state: DigestState,
        user_email: str,
        emit: EmitFn,
    ) -> None:
        evidence_rows = []
        for paper in state.evidence:
            evidence_rows.append(
                {
                    "title": paper.title,
                    "authors": ", ".join(paper.authors[:4]),
                    "published": paper.published,
                    "url": paper.url,
                    "summary": paper.summary,
                }
            )

        synthesis_input = (
            f"Topic: {state.topic}\n"
            f"Confidence: {state.confidence}/10\n"
            f"Evidence count: {len(state.evidence)}\n"
            f"Evidence JSON:\n{json.dumps(evidence_rows, ensure_ascii=False)}"
        )

        await emit("status", {"message": "Generating final digest..."})
        model = llm()

        stream = model.stream(
            [
                SystemMessage(content=self.SYSTEM_SYNTHESIS_PROMPT),
                HumanMessage(content=synthesis_input),
            ],
            config={"metadata": {"user_email": user_email}},
        )

        for chunk in stream:
            token = getattr(chunk, "content", "")
            if isinstance(token, list):
                token = "".join(
                    item.get("text", "") if isinstance(item, dict) else str(item)
                    for item in token
                )
            token_str = str(token)
            if token_str:
                await emit("token", {"text": token_str})

    async def run(
        self,
        topic: str,
        user_email: str,
        max_iterations: int,
        confidence_threshold: int,
        max_results_per_search: int,
        emit: EmitFn,
    ) -> None:
        state = DigestState(
            topic=topic,
            max_iterations=max_iterations,
            confidence_threshold=confidence_threshold,
            max_results_per_search=max_results_per_search,
        )

        await emit("status", {"message": f"Starting autonomous loop for topic: {topic}"})

        while state.iteration < state.max_iterations:
            query = await self._next_query(state, user_email)
            state.query_history.append(query)
            await emit(
                "status",
                {
                    "message": f"Iteration {state.iteration + 1}/{state.max_iterations}: searching arXiv",
                    "query": query,
                },
            )

            try:
                papers = await self._search(query, state.max_results_per_search)
            except Exception as exc:
                logger.exception("Research provider search failed")
                await emit("status", {"message": f"Search failure: {exc}"})
                break

            await emit("state", {"papers_found": len(papers), "iteration": state.iteration + 1})

            newly_relevant = 0
            for paper in papers:
                if not paper.paper_id or paper.paper_id in state.seen_ids:
                    continue

                score = self._score_relevance(state.topic, paper)
                if score < 0.12:
                    continue

                state.seen_ids.add(paper.paper_id)
                state.evidence.append(paper)
                newly_relevant += 1

            evidence_count = len(state.evidence)
            confidence_from_count = int(min(10, round((evidence_count / 12) * 10)))
            confidence_from_iteration = min(3, state.iteration)
            state.confidence = max(1, min(10, confidence_from_count + confidence_from_iteration))

            await emit(
                "state",
                {
                    "iteration": state.iteration + 1,
                    "new_relevant": newly_relevant,
                    "evidence_count": evidence_count,
                    "confidence": state.confidence,
                    "threshold": state.confidence_threshold,
                },
            )

            if state.confidence >= state.confidence_threshold and evidence_count >= 6:
                await emit(
                    "status",
                    {
                        "message": "Evidential threshold reached. Switching to digest generation.",
                        "confidence": state.confidence,
                    },
                )
                break

            state.iteration += 1

        if not state.evidence:
            await emit(
                "error",
                {
                    "message": "No relevant papers were collected. Try a more specific topic.",
                },
            )
            return

        await self._stream_synthesis(state, user_email, emit)
        await emit(
            "complete",
            {
                "topic": state.topic,
                "confidence": state.confidence,
                "evidence_count": len(state.evidence),
                "queries": state.query_history,
                "papers": [
                    {
                        "title": paper.title,
                        "url": paper.url,
                        "published": paper.published,
                    }
                    for paper in state.evidence[:12]
                ],
            },
        )
