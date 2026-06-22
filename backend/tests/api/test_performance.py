"""Performance learning API tests."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.api.conftest import decide_payload

pytestmark = pytest.mark.integration


async def test_outcome_accuracy_and_outperformers(api_client: AsyncClient) -> None:
    body = (
        await api_client.post(
            "/api/v1/recommendations/decide",
            json=decide_payload(f"TCS{uuid4().hex[:6]}"),
        )
    ).json()
    rec_id = body["recommendation_id"]

    out = await api_client.post(
        f"/api/v1/recommendations/{rec_id}/outcome",
        json={"horizon": "1m", "return_pct": 12.0, "nifty_return_pct": 5.0},
    )
    assert out.status_code == 200, out.text
    assert out.json()["alpha"] == pytest.approx(7.0)

    acc = await api_client.get("/api/v1/performance/agent-accuracy")
    assert acc.status_code == 200
    rows = acc.json()
    # All analysts were bullish (>=50) and alpha>0 → directionally correct.
    assert any(r["accuracy"] == pytest.approx(1.0) for r in rows)

    perf = await api_client.get("/api/v1/performance/outperformers")
    assert perf.status_code == 200
    ids = {r["recommendation_id"] for r in perf.json()}
    assert rec_id in ids
