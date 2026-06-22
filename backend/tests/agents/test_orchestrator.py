"""End-to-end orchestrator test: graph (stub LLM) → persisted recommendation."""

from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.agents.llm import StubLLM
from app.agents.orchestrator import run_analysis
from app.models.security import Security
from app.repositories.recommendation_repo import get_recommendation

pytestmark = pytest.mark.integration

STUB_SCORES = {
    "fundamental": 85.0,
    "technical": 78.0,
    "news": 90.0,
    "sector": 88.0,
    "institutional": 82.0,
    "risk": 70.0,
}


async def test_run_analysis_persists_explainable_recommendation(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        sec = Security(
            symbol=f"INFY{uuid4().hex[:6]}", exchange="NSE", sector="IT", name="Infosys"
        )
        session.add(sec)
        await session.flush()

        rec = await run_analysis(
            symbol=sec.symbol,
            security_id=sec.id,
            llm=StubLLM(STUB_SCORES),
            session=session,
            context="unit-test run",
        )
        rec_id = rec.id

    assert rec.action == "buy"
    assert rec.conviction == pytest.approx(84.0)

    async with session_factory() as session:
        fetched = await get_recommendation(session, rec_id)

    assert fetched is not None
    assert len(fetched.agent_scores) == 6
    assert len(fetched.conviction_breakdown) == 5
    assert fetched.band == "buy"
    assert {s.agent for s in fetched.agent_scores} == set(STUB_SCORES.keys())
