"""Read schemas for recommendations (full explainability)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AgentScoreOut(BaseModel):
    agent: str
    score: float
    weight: float | None
    rationale: str | None
    report: str | None = None


class ComponentOut(BaseModel):
    component: str
    score: float
    weight: float
    contribution: float


class PolicyEvalOut(BaseModel):
    rule: str
    passed: bool
    detail: str


class GuardCheckOut(BaseModel):
    check_name: str
    passed: bool
    detail: str


class RecommendationSummary(BaseModel):
    id: UUID
    security_id: UUID
    symbol: str
    exchange: str
    action: str
    conviction: float
    status: str
    created_at: datetime
    thesis: str | None = None


class RecommendationDetail(BaseModel):
    id: UUID
    security_id: UUID
    symbol: str
    exchange: str
    action: str
    conviction: float
    base_score: float
    band: str
    status: str
    thesis: str | None
    created_at: datetime
    agent_scores: list[AgentScoreOut]
    conviction_breakdown: list[ComponentOut]
    policy_evaluations: list[PolicyEvalOut]
    trade_guard_results: list[GuardCheckOut]
    health_score: float | None = None
    is_value_trap: bool | None = None
    entry_price: float | None = None
    stop_loss: float | None = None
    target_price: float | None = None
    debate_transcript: str | None = None
    investment_plan: str | None = None
    conviction_adjustment: float | None = None
