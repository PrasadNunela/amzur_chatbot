"""Streaming API for autonomous research digest agent."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.db.session import get_current_user
from app.services.research.digest_agent import ResearchDigestAgent

router = APIRouter(prefix="/research-digest", tags=["research-digest"])


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.get("/stream")
async def stream_research_digest(
    topic: str = Query(..., min_length=3, max_length=300),
    max_iterations: int = Query(4, ge=1, le=10),
    confidence_threshold: int = Query(7, ge=1, le=10),
    max_results_per_search: int = Query(8, ge=1, le=20),
    current_user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """SSE stream that emits autonomous loop state changes and digest tokens."""

    async def event_generator():
        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        agent = ResearchDigestAgent()

        async def emit(event_type: str, data: dict[str, Any]) -> None:
            await queue.put({"type": event_type, "data": data})

        async def run_agent() -> None:
            try:
                await agent.run(
                    topic=topic,
                    user_email=current_user["email"],
                    max_iterations=max_iterations,
                    confidence_threshold=confidence_threshold,
                    max_results_per_search=max_results_per_search,
                    emit=emit,
                )
            except Exception as exc:
                await emit("error", {"message": str(exc)})
            finally:
                await queue.put(None)

        task = asyncio.create_task(run_agent())

        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield _sse(item)
        finally:
            if not task.done():
                task.cancel()
                with contextlib.suppress(Exception):
                    await task

    import contextlib

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
