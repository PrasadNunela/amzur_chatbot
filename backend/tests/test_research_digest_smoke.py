from dataclasses import dataclass
import asyncio

import app.services.research.digest_agent as da
from app.services.research.providers.base import PaperRecord


@dataclass
class Chunk:
    content: str


class DummyModel:
    def invoke(self, messages, config=None):
        class Resp:
            content = "transformer optimization for scientific retrieval"

        return Resp()

    def stream(self, messages, config=None):
        text = (
            "Executive Summary\n"
            "- This is a mocked digest stream.\n"
            "Key Findings\n"
            "- Paper evidence converges on retrieval-augmented transformer methods."
        )
        for token in text.split(" "):
            yield Chunk(content=token + " ")


class DummyProvider:
    def search(self, query: str, max_results: int = 8):
        return [
            PaperRecord(
                paper_id=f"id-{i}",
                title=f"Transformer Methods for Neural Retrieval {i}",
                summary=(
                    "This paper studies transformer methods "
                    "for neural retrieval and graph signals."
                ),
                authors=["Author A", "Author B"],
                published="2025-01-01",
                url=f"https://arxiv.org/abs/1234.{i:04d}",
            )
            for i in range(1, 9)
        ]


def test_research_digest_agent_emits_expected_events():
    da.llm = lambda: DummyModel()

    async def run_agent():
        agent = da.ResearchDigestAgent()
        agent.provider = DummyProvider()

        events = []

        async def emit(event_type, data):
            events.append((event_type, data))

        await agent.run(
            topic="neural retrieval transformers",
            user_email="test@example.com",
            max_iterations=3,
            confidence_threshold=6,
            max_results_per_search=8,
            emit=emit,
        )
        return events

    events = asyncio.run(run_agent())
    event_types = [kind for kind, _ in events]

    assert "status" in event_types
    assert "token" in event_types
    assert "complete" in event_types

    complete_payload = next((data for kind, data in events if kind == "complete"), None)
    assert complete_payload is not None
    assert complete_payload.get("evidence_count", 0) >= 1
