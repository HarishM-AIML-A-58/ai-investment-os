"""Policy management API (single-user bootstrap)."""

from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import UserPolicyModel
from app.repositories.policy_repo import get_policy, upsert_policy

router = APIRouter(prefix="/policies", tags=["policies"])


class PolicyBody(BaseModel):
    monthly_budget: Decimal = Field(gt=0)
    risk_profile: str = "moderate"
    max_position_pct: float = Field(default=20.0, gt=0, le=100)
    max_sector_pct: float = Field(default=30.0, gt=0, le=100)
    min_conviction: float = Field(default=80.0, ge=0, le=100)
    cash_reserve_pct: float = Field(default=20.0, ge=0, le=100)
    auto_execute: bool = False
    autonomy_tier: int = Field(default=0, ge=0, le=2)


def _to_body(p: UserPolicyModel) -> PolicyBody:
    return PolicyBody(
        monthly_budget=p.monthly_budget,
        risk_profile=p.risk_profile,
        max_position_pct=p.max_position_pct,
        max_sector_pct=p.max_sector_pct,
        min_conviction=p.min_conviction,
        cash_reserve_pct=p.cash_reserve_pct,
        auto_execute=p.auto_execute,
        autonomy_tier=p.autonomy_tier,
    )


@router.get("", response_model=PolicyBody)
async def read_policy(db: AsyncSession = Depends(get_db)) -> PolicyBody:
    policy = await get_policy(db)
    if policy is None:
        raise HTTPException(status_code=404, detail="no policy configured")
    return _to_body(policy)


@router.put("", response_model=PolicyBody)
async def update_policy(
    body: PolicyBody, db: AsyncSession = Depends(get_db)
) -> PolicyBody:
    policy = await upsert_policy(db, **body.model_dump())
    return _to_body(policy)
