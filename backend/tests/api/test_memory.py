"""Memory recall API test (pgvector + stub embedder)."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.api.conftest import decide_payload

pytestmark = pytest.mark.integration


async def test_decide_then_semantic_recall(api_client: AsyncClient) -> None:
    symbol = f"HDFC{uuid4().hex[:6]}"
    body = (
        await api_client.post(
            "/api/v1/recommendations/decide", json=decide_payload(symbol)
        )
    ).json()
    rec_id = body["recommendation_id"]

    detail = (await api_client.get(f"/api/v1/recommendations/{rec_id}")).json()
    thesis = detail["thesis"]

    # The stub embedder is deterministic, so querying the exact thesis recalls it.
    resp = await api_client.get(
        "/api/v1/memory/search", params={"q": thesis, "limit": 5}
    )
    assert resp.status_code == 200, resp.text
    hits = resp.json()
    assert len(hits) >= 1
    top = hits[0]
    assert top["ref_id"] == rec_id
    assert top["distance"] == pytest.approx(0.0, abs=1e-6)
