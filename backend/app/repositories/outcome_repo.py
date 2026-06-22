"""Recommendation outcomes + performance analytics queries."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outcome import RecommendationOutcome
from app.models.recommendation import AgentScore, Recommendation


async def add_outcome(
    session: AsyncSession,
    *,
    recommendation_id: UUID,
    horizon: str,
    return_pct: float,
    nifty_return_pct: float,
) -> RecommendationOutcome:
    outcome = RecommendationOutcome(
        recommendation_id=recommendation_id,
        horizon=horizon,
        return_pct=return_pct,
        nifty_return_pct=nifty_return_pct,
        alpha=return_pct - nifty_return_pct,
    )
    session.add(outcome)
    await session.commit()
    await session.refresh(outcome)
    return outcome


async def agent_accuracy(session: AsyncSession) -> list[dict]:
    """Per-agent directional accuracy vs realised alpha.

    An agent scoring >= 50 is bullish; it is "correct" when realised alpha > 0.
    """
    stmt = select(
        AgentScore.agent, AgentScore.score, RecommendationOutcome.alpha
    ).join(
        RecommendationOutcome,
        RecommendationOutcome.recommendation_id == AgentScore.recommendation_id,
    )
    rows = (await session.execute(stmt)).all()

    agg: dict[str, list[int]] = {}
    for agent, score, alpha in rows:
        correct = (score >= 50) == (alpha > 0)
        bucket = agg.setdefault(agent, [0, 0])  # [correct, total]
        bucket[1] += 1
        if correct:
            bucket[0] += 1

    return [
        {
            "agent": agent,
            "samples": total,
            "accuracy": round(correct / total, 4) if total else 0.0,
        }
        for agent, (correct, total) in sorted(agg.items())
    ]


async def outperformers(session: AsyncSession, *, limit: int = 50) -> list[dict]:
    """Recommendations whose realised alpha beat NIFTY, best first."""
    stmt = (
        select(Recommendation, RecommendationOutcome.alpha)
        .join(
            RecommendationOutcome,
            RecommendationOutcome.recommendation_id == Recommendation.id,
        )
        .where(RecommendationOutcome.alpha > 0)
        .order_by(RecommendationOutcome.alpha.desc())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).all()
    return [
        {
            "recommendation_id": str(rec.id),
            "security_id": str(rec.security_id),
            "action": rec.action,
            "conviction": rec.conviction,
            "alpha": float(alpha),
        }
        for rec, alpha in rows
    ]
