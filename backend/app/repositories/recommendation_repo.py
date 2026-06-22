"""Persistence for recommendations and their explainability trail."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.recommendation import Recommendation


async def create_recommendation(
    session: AsyncSession, recommendation: Recommendation
) -> Recommendation:
    """Persist a recommendation with all nested children (cascade)."""
    session.add(recommendation)
    await session.commit()
    await session.refresh(recommendation)
    return recommendation


async def get_recommendation(
    session: AsyncSession, recommendation_id: UUID
) -> Recommendation | None:
    """Fetch a recommendation, eagerly loading its full explainability trail."""
    stmt = (
        select(Recommendation)
        .where(Recommendation.id == recommendation_id)
        .options(
            selectinload(Recommendation.agent_scores),
            selectinload(Recommendation.conviction_breakdown),
            selectinload(Recommendation.policy_evaluations),
            selectinload(Recommendation.trade_guard_results),
        )
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_recommendations(
    session: AsyncSession, *, limit: int = 50
) -> list[Recommendation]:
    """Most-recent recommendations (summary; children not eagerly loaded)."""
    stmt = (
        select(Recommendation)
        .order_by(Recommendation.created_at.desc())
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())
