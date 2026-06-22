"""Recommendation + decision-flow API."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.llm.base import LLMClient
from app.agents.llm.embedder import Embedder
from app.api.deps import get_embedder, get_grounding, get_llm
from app.decision import DecisionInput, DecisionOutcome, DecisionService
from app.db.session import get_db
from app.models.security import Security
from app.repositories.recommendation_repo import (
    get_recommendation,
    list_recommendations,
)
from app.schemas.recommendation import (
    AgentScoreOut,
    ComponentOut,
    GuardCheckOut,
    PolicyEvalOut,
    RecommendationDetail,
    RecommendationSummary,
)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/decide", response_model=DecisionOutcome)
async def decide(
    data: DecisionInput,
    db: AsyncSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    embedder: Embedder | None = Depends(get_embedder),
    grounding=Depends(get_grounding),
) -> DecisionOutcome:
    """Run analysis → conviction → policy → trade guard, persist, and return."""
    return await DecisionService().decide(
        data=data, session=db, llm=llm, embedder=embedder, grounding=grounding
    )


@router.get("", response_model=list[RecommendationSummary])
async def list_recs(
    limit: int = 50, db: AsyncSession = Depends(get_db)
) -> list[RecommendationSummary]:
    rows = await list_recommendations(db, limit=limit)
    return [
        RecommendationSummary(
            id=r.id,
            security_id=r.security_id,
            action=r.action,
            conviction=r.conviction,
            status=r.status,
            created_at=r.created_at,
            thesis=r.thesis,
        )
        for r in rows
    ]


@router.get("/{recommendation_id}", response_model=RecommendationDetail)
async def get_rec(
    recommendation_id: UUID, db: AsyncSession = Depends(get_db)
) -> RecommendationDetail:
    rec = await get_recommendation(db, recommendation_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="recommendation not found")

    security = await db.get(Security, rec.security_id)
    symbol = security.symbol if security else ""
    exchange = security.exchange if security else ""

    thesis_clean = rec.thesis
    health_score = None
    is_value_trap = None
    entry_price = None
    stop_loss = None
    target_price = None

    if rec.thesis and "[Metadata]" in rec.thesis:
        parts = rec.thesis.split("[Metadata]")
        thesis_clean = parts[0].strip()
        try:
            import json
            meta_dict = json.loads(parts[1].strip())
            health_score = meta_dict.get("health_score")
            is_value_trap = meta_dict.get("is_value_trap")
            entry_price = meta_dict.get("entry_price")
            stop_loss = meta_dict.get("stop_loss")
            target_price = meta_dict.get("target_price")
        except Exception:
            pass

    return RecommendationDetail(
        id=rec.id,
        security_id=rec.security_id,
        symbol=symbol,
        exchange=exchange,
        action=rec.action,
        conviction=rec.conviction,
        base_score=rec.base_score,
        band=rec.band,
        status=rec.status,
        thesis=thesis_clean,
        created_at=rec.created_at,
        agent_scores=[
            AgentScoreOut(
                agent=s.agent, score=s.score, weight=s.weight, rationale=s.rationale,
                report=s.report,
            )
            for s in rec.agent_scores
        ],
        conviction_breakdown=[
            ComponentOut(
                component=c.component,
                score=c.score,
                weight=c.weight,
                contribution=c.contribution,
            )
            for c in rec.conviction_breakdown
        ],
        policy_evaluations=[
            PolicyEvalOut(rule=p.rule, passed=p.passed, detail=p.detail)
            for p in rec.policy_evaluations
        ],
        trade_guard_results=[
            GuardCheckOut(check_name=g.check_name, passed=g.passed, detail=g.detail)
            for g in rec.trade_guard_results
        ],
        health_score=health_score,
        is_value_trap=is_value_trap,
        entry_price=entry_price,
        stop_loss=stop_loss,
        target_price=target_price,
        debate_transcript=rec.debate_transcript,
        investment_plan=rec.investment_plan,
        conviction_adjustment=rec.conviction_adjustment,
    )
