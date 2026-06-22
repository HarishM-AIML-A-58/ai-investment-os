"""Policy management API tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_put_then_get_policy(api_client: AsyncClient) -> None:
    payload = {
        "monthly_budget": "15000",
        "risk_profile": "moderate",
        "max_position_pct": 25.0,
        "max_sector_pct": 35.0,
        "min_conviction": 82.0,
        "cash_reserve_pct": 15.0,
        "auto_execute": True,
        "autonomy_tier": 1,
    }
    put = await api_client.put("/api/v1/policies", json=payload)
    assert put.status_code == 200, put.text
    assert put.json()["monthly_budget"] == "15000.00"

    get = await api_client.get("/api/v1/policies")
    assert get.status_code == 200
    body = get.json()
    assert body["max_position_pct"] == 25.0
    assert body["auto_execute"] is True
    assert body["autonomy_tier"] == 1
