"""Persistence integration tests — run against live PostgreSQL + pgvector.

Requires migrations applied (``alembic upgrade head``) before the suite runs.
"""

from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.memory import EMBEDDING_DIM
from app.models.recommendation import (
    AgentScore,
    ConvictionBreakdown,
    PolicyEvaluation,
    Recommendation,
    TradeGuardResult,
)
from app.models.security import Security
from app.repositories.memory_repo import add_embedding, search_similar
from app.repositories.recommendation_repo import (
    create_recommendation,
    get_recommendation,
)

pytestmark = pytest.mark.integration

GUARD_CHECKS = [
    "budget",
    "risk",
    "portfolio_exposure",
    "sector_exposure",
    "policy",
    "market_hours",
    "liquidity",
]


def _unit_vec(index: int, dim: int = EMBEDDING_DIM) -> list[float]:
    vec = [0.0] * dim
    vec[index] = 1.0
    return vec


async def test_recommendation_round_trip_with_full_trail(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        sec = Security(
            symbol=f"TCS{uuid4().hex[:6]}", exchange="NSE", sector="IT", name="Tata"
        )
        session.add(sec)
        await session.flush()

        rec = Recommendation(
            security_id=sec.id,
            action="buy",
            conviction=84.0,
            base_score=84.0,
            band="buy",
            engine_version="conviction-1.0.0",
            thesis="Strong fundamentals and breakout.",
            agent_scores=[
                AgentScore(agent="fundamental", score=85.0, weight=0.30, rationale="ROE up"),
                AgentScore(agent="technical", score=78.0, weight=0.25, rationale="Breakout"),
            ],
            conviction_breakdown=[
                ConvictionBreakdown(component=c, score=80.0, weight=0.2, contribution=16.0)
                for c in (
                    "fundamentals",
                    "technicals",
                    "news",
                    "sector_strength",
                    "institutional_activity",
                )
            ],
            policy_evaluations=[
                PolicyEvaluation(rule="min_conviction", passed=True, detail="84 >= 80"),
            ],
            trade_guard_results=[
                TradeGuardResult(check_name=name, passed=True, detail="ok")
                for name in GUARD_CHECKS
            ],
        )
        saved = await create_recommendation(session, rec)
        rec_id = saved.id

    assert rec_id is not None

    # Read back through a fresh session → real database round-trip.
    async with session_factory() as session:
        fetched = await get_recommendation(session, rec_id)

    assert fetched is not None
    assert fetched.action == "buy"
    assert fetched.conviction == pytest.approx(84.0)
    assert len(fetched.agent_scores) == 2
    assert len(fetched.conviction_breakdown) == 5
    assert len(fetched.policy_evaluations) == 1
    assert len(fetched.trade_guard_results) == 7


async def test_pgvector_similarity_recall(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    tag = uuid4().hex[:8]
    async with session_factory() as session:
        await add_embedding(
            session, kind=f"thesis-{tag}", content="alpha", embedding=_unit_vec(0)
        )
        await add_embedding(
            session, kind=f"thesis-{tag}", content="beta", embedding=_unit_vec(5)
        )
        await add_embedding(
            session, kind=f"thesis-{tag}", content="gamma", embedding=_unit_vec(10)
        )

        results = await search_similar(
            session, _unit_vec(0), limit=1, kind=f"thesis-{tag}"
        )

    assert len(results) == 1
    nearest, distance = results[0]
    assert nearest.content == "alpha"
    assert distance == pytest.approx(0.0, abs=1e-6)
