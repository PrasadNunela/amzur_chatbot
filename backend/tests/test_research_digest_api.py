import json

from fastapi.testclient import TestClient

from main import app
import app.api.research_digest as research_digest_api


def _collect_sse_events(body_text: str) -> list[dict]:
    events: list[dict] = []
    for line in body_text.splitlines():
        if line.startswith("data: "):
            payload = line[len("data: ") :]
            events.append(json.loads(payload))
    return events


def test_research_digest_stream_returns_sse_events(monkeypatch):
    async def fake_current_user():
        return {"email": "test@example.com"}

    async def fake_run(
        self,
        topic,
        user_email,
        max_iterations,
        confidence_threshold,
        max_results_per_search,
        emit,
    ):
        await emit("status", {"message": f"starting {topic}"})
        await emit("token", {"text": "hello "})
        await emit(
            "complete",
            {
                "topic": topic,
                "queries": ["q1"],
                "papers": [],
                "confidence": 8,
                "evidence_count": 1,
            },
        )

    app.dependency_overrides[research_digest_api.get_current_user] = fake_current_user
    monkeypatch.setattr(research_digest_api.ResearchDigestAgent, "run", fake_run)

    client = TestClient(app)
    response = client.get(
        "/api/research-digest/stream",
        params={
            "topic": "graph neural networks",
            "max_iterations": 3,
            "confidence_threshold": 7,
            "max_results_per_search": 8,
        },
    )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    events = _collect_sse_events(response.text)
    assert len(events) == 3
    assert events[0]["type"] == "status"
    assert events[1]["type"] == "token"
    assert events[2]["type"] == "complete"
    assert events[2]["data"]["evidence_count"] == 1

    app.dependency_overrides.clear()
