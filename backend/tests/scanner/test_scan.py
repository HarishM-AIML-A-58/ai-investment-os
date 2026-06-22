"""Scanner integration test: run_scan persists a gated rec per candidate."""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.agents.llm import StubLLM
from app.decision import AccountState, MarketState
from app.engine.policy import UserPolicy
from app.repositories.recommendation_repo import list_recommendations
from app.scanner import ScanCandidate, run_scan

pytestmark = pytest.mark.integration

STUB_SCORES = {
    "fundamental": 85.0,
    "technical": 78.0,
    "news": 90.0,
    "sector": 88.0,
    "institutional": 82.0,
    "risk": 70.0,
}


async def test_run_scan_persists_for_each_candidate(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    tag = uuid4().hex[:6]
    candidates = [
        ScanCandidate(symbol=f"SCANA{tag}", sector="IT"),
        ScanCandidate(symbol=f"SCANB{tag}", sector="BANK"),
    ]
    policy = UserPolicy(monthly_budget=Decimal("10000"))
    account = AccountState(
        total_capital=Decimal("100000"), cash_available=Decimal("100000")
    )
    market = MarketState(avg_daily_value=Decimal("10000000"))

    async with session_factory() as session:
        outcomes = await run_scan(
            candidates=candidates,
            llm=StubLLM(STUB_SCORES),
            session=session,
            policy=policy,
            account=account,
            market=market,
        )

    assert len(outcomes) == 2
    assert all(o.status == "guard_passed" for o in outcomes)
    assert all(o.conviction == pytest.approx(84.0) for o in outcomes)

    async with session_factory() as session:
        recent = await list_recommendations(session, limit=100)
    assert len(recent) >= 2
