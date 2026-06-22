"""Reports API tests."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.api.conftest import decide_payload

pytestmark = pytest.mark.integration


async def test_generate_and_fetch_report(api_client: AsyncClient) -> None:
    await api_client.post(
        "/api/v1/recommendations/decide", json=decide_payload(f"TCS{uuid4().hex[:6]}")
    )

    report_date = f"2026-06-{(hash(uuid4().hex) % 27) + 1:02d}"
    gen = await api_client.post(
        "/api/v1/reports/generate",
        json={"report_date": report_date, "report_type": "morning"},
    )
    assert gen.status_code == 200, gen.text
    payload = gen.json()["payload"]
    assert payload["type"] == "morning"
    assert len(payload["top_opportunities"]) >= 1

    fetched = await api_client.get(f"/api/v1/reports/{report_date}/morning")
    assert fetched.status_code == 200
    assert fetched.json()["report_type"] == "morning"


async def test_invalid_report_type_rejected(api_client: AsyncClient) -> None:
    resp = await api_client.post(
        "/api/v1/reports/generate",
        json={"report_date": "2026-06-19", "report_type": "midday"},
    )
    assert resp.status_code == 422
