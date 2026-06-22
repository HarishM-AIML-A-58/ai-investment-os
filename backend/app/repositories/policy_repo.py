"""Single-user bootstrap + policy persistence."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.user import User, UserPolicyModel


async def get_or_create_default_user(session: AsyncSession) -> User:
    email = get_settings().owner_email
    stmt = select(User).where(User.email == email)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if user is not None:
        return user
    user = User(email=email)
    session.add(user)
    await session.flush()
    return user


async def get_policy(session: AsyncSession) -> UserPolicyModel | None:
    user = await get_or_create_default_user(session)
    stmt = select(UserPolicyModel).where(UserPolicyModel.user_id == user.id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def upsert_policy(
    session: AsyncSession,
    *,
    monthly_budget: Decimal,
    risk_profile: str,
    max_position_pct: float,
    max_sector_pct: float,
    min_conviction: float,
    cash_reserve_pct: float,
    auto_execute: bool,
    autonomy_tier: int,
) -> UserPolicyModel:
    user = await get_or_create_default_user(session)
    policy = await get_policy(session)
    if policy is None:
        policy = UserPolicyModel(user_id=user.id)
        session.add(policy)
    policy.monthly_budget = monthly_budget
    policy.risk_profile = risk_profile
    policy.max_position_pct = max_position_pct
    policy.max_sector_pct = max_sector_pct
    policy.min_conviction = min_conviction
    policy.cash_reserve_pct = cash_reserve_pct
    policy.auto_execute = auto_execute
    policy.autonomy_tier = autonomy_tier
    await session.commit()
    await session.refresh(policy)
    return policy
