"""Performance learning API: outcomes, agent accuracy, outperformers."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.outcome_repo import (
    add_outcome,
    agent_accuracy,
    outperformers,
)
from app.repositories.recommendation_repo import get_recommendation

router = APIRouter(tags=["performance"])


class OutcomeBody(BaseModel):
    horizon: str
    return_pct: float
    nifty_return_pct: float


class OutcomeResult(BaseModel):
    recommendation_id: UUID
    horizon: str
    return_pct: float
    nifty_return_pct: float
    alpha: float


@router.post("/recommendations/{recommendation_id}/outcome", response_model=OutcomeResult)
async def record_outcome(
    recommendation_id: UUID,
    body: OutcomeBody,
    db: AsyncSession = Depends(get_db),
) -> OutcomeResult:
    rec = await get_recommendation(db, recommendation_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="recommendation not found")
    outcome = await add_outcome(
        db,
        recommendation_id=recommendation_id,
        horizon=body.horizon,
        return_pct=body.return_pct,
        nifty_return_pct=body.nifty_return_pct,
    )
    return OutcomeResult(
        recommendation_id=recommendation_id,
        horizon=outcome.horizon,
        return_pct=outcome.return_pct,
        nifty_return_pct=outcome.nifty_return_pct,
        alpha=outcome.alpha,
    )


@router.get("/performance/agent-accuracy")
async def get_agent_accuracy(db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await agent_accuracy(db)


@router.get("/performance/outperformers")
async def get_outperformers(
    limit: int = 50, db: AsyncSession = Depends(get_db)
) -> list[dict]:
    return await outperformers(db, limit=limit)
