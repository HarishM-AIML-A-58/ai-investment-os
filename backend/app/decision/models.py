"""Inputs/outputs for the end-to-end decision flow."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.domain.enums import TradeSide
from app.engine.policy.models import UserPolicy


class AccountState(BaseModel):
    """Portfolio/budget state needed by the Policy Engine and Trade Guard."""

    total_capital: Decimal = Field(gt=0)
    cash_available: Decimal = Field(ge=0)
    sector_exposure: Decimal = Field(default=Decimal("0"), ge=0)
    month_to_date_spend: Decimal = Field(default=Decimal("0"), ge=0)


class MarketState(BaseModel):
    """Live market/circuit-breaker state needed by the Trade Guard."""

    market_open: bool = True
    avg_daily_value: Decimal = Field(gt=0)
    trades_today: int = Field(default=0, ge=0)
    deployed_today: Decimal = Field(default=Decimal("0"), ge=0)
    kill_switch: bool = False


class DecisionInput(BaseModel):
    symbol: str
    exchange: str = "NSE"
    sector: str
    side: TradeSide = TradeSide.BUY
    context: str = ""
    policy: UserPolicy
    account: AccountState
    market: MarketState


class DecisionOutcome(BaseModel):
    recommendation_id: UUID
    action: str
    conviction: float
    status: str
    target_value: Decimal
    policy_allowed: bool | None
    guard_passed: bool
    can_auto_execute: bool
    health_score: float | None = None
    is_value_trap: bool | None = None
    entry_price: float | None = None
    stop_loss: float | None = None
    target_price: float | None = None
