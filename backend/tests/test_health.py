"""Health/readiness endpoint tests.

Liveness is dependency-free. Readiness runs against the live PostgreSQL and
Redis services provided by Docker Compose, so it asserts a fully-ready system.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def test_liveness(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"]
    assert body["version"]


@pytest.mark.integration
async def test_readiness_all_dependencies_ok(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/health/ready")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "ok"
    assert body["components"]["database"]["status"] == "ok"
    assert body["components"]["redis"]["status"] == "ok"
