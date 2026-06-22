"""Shared fixtures for API tests.

Overrides every external dependency with a deterministic stub/fake so the full
HTTP surface runs in-container with no Azure key or live broker.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from decimal import Decimal

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.agents.llm import StubLLM
from app.agents.llm.embedder import StubEmbedder
from app.api.deps import get_embedder, get_gateway, get_grounding, get_llm
from app.db.session import get_db
from app.gateway.models import OrderPreview, OrderRequest, OrderResult
from app.main import app

STUB_SCORES = {
    "fundamental": 85.0,
    "technical": 78.0,
    "news": 90.0,
    "sector": 88.0,
    "institutional": 82.0,
    "risk": 70.0,
}


class FakeGateway:
    """In-memory broker gateway for API tests."""

    def __init__(self) -> None:
        self.place_calls = 0

    async def preview_order(self, order: OrderRequest) -> OrderPreview:
        return OrderPreview(
            valid=True,
            estimated_value=Decimal("1000"),
            margin_required=Decimal("1000"),
            message="ok",
        )

    async def place_order(self, order: OrderRequest) -> OrderResult:
        self.place_calls += 1
        return OrderResult(
            order_id=f"BROKER-{self.place_calls}", status="open", message="placed"
        )


@pytest_asyncio.fixture
async def api_client(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncClient, None]:
    async def _get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_llm] = lambda: StubLLM(STUB_SCORES)
    app.dependency_overrides[get_embedder] = lambda: StubEmbedder()
    app.dependency_overrides[get_gateway] = lambda: FakeGateway()
    app.dependency_overrides[get_grounding] = lambda: None  # no live network in tests
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


def decide_payload(symbol: str, *, min_conviction: float = 80.0) -> dict:
    return {
        "symbol": symbol,
        "exchange": "NSE",
        "sector": "IT",
        "side": "buy",
        "context": "api test",
        "policy": {
            "monthly_budget": "10000",
            "max_position_pct": 20.0,
            "max_sector_pct": 30.0,
            "min_conviction": min_conviction,
            "cash_reserve_pct": 20.0,
            "auto_execute": False,
            "autonomy_tier": 0,
        },
        "account": {
            "total_capital": "100000",
            "cash_available": "100000",
            "sector_exposure": "0",
            "month_to_date_spend": "0",
        },
        "market": {
            "market_open": True,
            "avg_daily_value": "10000000",
            "trades_today": 0,
            "deployed_today": "0",
            "kill_switch": False,
        },
    }
