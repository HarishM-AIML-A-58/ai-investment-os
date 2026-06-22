"""Policy Engine I/O models.

The Policy Engine is fully deterministic and can override AI decisions. It
evaluates a proposed trade against the user's policy and current account state,
returning ALLOW/BLOCK with a per-rule audit trail.
"""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, Field

from app.domain.enums import AutonomyTier, Decision, RiskProfile, TradeSide


class UserPolicy(BaseModel):
    """User-defined investing policy. Percentages are on a 0-100 scale."""

    monthly_budget: Decimal = Field(gt=0)
    risk_profile: RiskProfile = RiskProfile.MODERATE
    max_position_pct: float = Field(default=20.0, gt=0, le=100)
    max_sector_pct: float = Field(default=30.0, gt=0, le=100)
    min_conviction: float = Field(default=80.0, ge=0, le=100)
    cash_reserve_pct: float = Field(default=20.0, ge=0, le=100)
    auto_execute: bool = False
    autonomy_tier: AutonomyTier = AutonomyTier.PROPOSE


class ProposedTrade(BaseModel):
    symbol: str
    sector: str
    side: TradeSide
    value: Decimal = Field(gt=0)  # notional ₹ for this order
    conviction: float = Field(ge=0, le=100)


class PolicyContext(BaseModel):
    """Current account state needed to evaluate a trade."""

    total_capital: Decimal = Field(gt=0)  # holdings + cash
    cash_available: Decimal = Field(ge=0)
    sector_exposure: Decimal = Field(ge=0)  # current ₹ exposure in trade's sector
    month_to_date_spend: Decimal = Field(ge=0)
    trade: ProposedTrade


class PolicyCheck(BaseModel):
    rule: str
    passed: bool
    detail: str


class PolicyResult(BaseModel):
    decision: Decision
    checks: list[PolicyCheck]

    @property
    def allowed(self) -> bool:
        return self.decision is Decision.ALLOW

    @property
    def failed_rules(self) -> list[str]:
        return [c.rule for c in self.checks if not c.passed]
