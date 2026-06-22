"""Trade Guard I/O models — the final deterministic gate before execution."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, Field

from app.engine.policy.models import PolicyContext, UserPolicy


class GuardConfig(BaseModel):
    """Operator-tuned guard thresholds and circuit-breaker limits."""

    risk_floor: float = Field(default=50.0, ge=0, le=100)
    max_adv_participation_pct: float = Field(default=1.0, gt=0, le=100)
    max_trades_per_day: int = Field(default=10, ge=1)
    max_daily_deployment: Decimal = Field(default=Decimal("100000"), gt=0)
    # Tier-1 (CAPPED) auto-execution envelope
    tier1_max_value: Decimal = Field(default=Decimal("2000"), gt=0)
    tier1_min_conviction: float = Field(default=85.0, ge=0, le=100)


class GuardContext(BaseModel):
    """Everything the guard needs that is not in policy config."""

    policy: UserPolicy
    policy_context: PolicyContext
    risk_score: float = Field(ge=0, le=100)
    market_open: bool
    avg_daily_value: Decimal = Field(gt=0)  # ADV in ₹ for liquidity check
    # Circuit-breaker state
    trades_today: int = Field(default=0, ge=0)
    deployed_today: Decimal = Field(default=Decimal("0"), ge=0)
    kill_switch: bool = False


class GuardCheck(BaseModel):
    name: str
    passed: bool
    detail: str


class GuardResult(BaseModel):
    passed: bool
    circuit_breaker_tripped: bool
    checks: list[GuardCheck]

    @property
    def failed_checks(self) -> list[str]:
        return [c.name for c in self.checks if not c.passed]
