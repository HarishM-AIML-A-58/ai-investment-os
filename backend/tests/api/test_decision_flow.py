"""End-to-end API test: POST /decide drives the full deterministic chain."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.api.conftest import decide_payload

pytestmark = pytest.mark.integration


async def test_decide_guard_passed_and_detail(api_client: AsyncClient) -> None:
    symbol = f"TCS{uuid4().hex[:6]}"
    resp = await api_client.post(
        "/api/v1/recommendations/decide", json=decide_payload(symbol)
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["action"] == "buy"
    assert body["conviction"] == pytest.approx(84.0)
    assert body["status"] == "guard_passed"
    assert body["policy_allowed"] is True
    assert body["guard_passed"] is True
    assert body["can_auto_execute"] is False
    assert body["target_value"] == "10000.00"

    rec_id = body["recommendation_id"]
    detail = await api_client.get(f"/api/v1/recommendations/{rec_id}")
    assert detail.status_code == 200
    d = detail.json()
    assert d["symbol"] == symbol
    assert len(d["agent_scores"]) == 6
    assert len(d["conviction_breakdown"]) == 5
    assert len(d["policy_evaluations"]) == 6
    assert len(d["trade_guard_results"]) == 7
    assert all(g["passed"] for g in d["trade_guard_results"])


async def test_decide_blocked_by_min_conviction(api_client: AsyncClient) -> None:
    symbol = f"INFY{uuid4().hex[:6]}"
    resp = await api_client.post(
        "/api/v1/recommendations/decide",
        json=decide_payload(symbol, min_conviction=95.0),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "blocked"
    assert body["policy_allowed"] is False
    assert body["guard_passed"] is False


async def test_list_recommendations(api_client: AsyncClient) -> None:
    await api_client.post(
        "/api/v1/recommendations/decide", json=decide_payload(f"WIP{uuid4().hex[:6]}")
    )
    resp = await api_client.get("/api/v1/recommendations?limit=5")
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) >= 1
    assert {"id", "action", "conviction", "status"} <= set(rows[0].keys())
