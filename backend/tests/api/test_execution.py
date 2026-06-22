"""Execution API tests — human-approved, gated, idempotent."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.api.conftest import decide_payload

pytestmark = pytest.mark.integration


async def _decide(client: AsyncClient, symbol: str, **kw) -> dict:
    resp = await client.post(
        "/api/v1/recommendations/decide", json=decide_payload(symbol, **kw)
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_execute_guard_passed_then_idempotent(api_client: AsyncClient) -> None:
    body = await _decide(api_client, f"TCS{uuid4().hex[:6]}")
    assert body["status"] == "guard_passed"
    rec_id = body["recommendation_id"]

    resp = await api_client.post(
        f"/api/v1/recommendations/{rec_id}/execute", json={"quantity": 5}
    )
    assert resp.status_code == 200, resp.text
    order = resp.json()
    assert order["status"] == "open"
    assert order["broker_order_id"] == "BROKER-1"
    assert order["quantity"] == 5

    # Idempotent replay returns the same order; no second placement.
    resp2 = await api_client.post(
        f"/api/v1/recommendations/{rec_id}/execute", json={"quantity": 5}
    )
    assert resp2.status_code == 200
    assert resp2.json()["id"] == order["id"]
    assert resp2.json()["broker_order_id"] == "BROKER-1"


async def test_execute_blocked_recommendation_rejected(api_client: AsyncClient) -> None:
    body = await _decide(api_client, f"INFY{uuid4().hex[:6]}", min_conviction=95.0)
    assert body["status"] == "blocked"
    rec_id = body["recommendation_id"]

    resp = await api_client.post(
        f"/api/v1/recommendations/{rec_id}/execute", json={"quantity": 5}
    )
    assert resp.status_code == 409
