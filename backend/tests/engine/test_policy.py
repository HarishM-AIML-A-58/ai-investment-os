"""Policy Engine unit tests (pure, deterministic)."""

from __future__ import annotations

from decimal import Decimal

from app.domain.enums import Decision, TradeSide
from app.engine.policy import (
    PolicyContext,
    PolicyEngine,
    ProposedTrade,
    UserPolicy,
)


def _policy(**overrides) -> UserPolicy:
    base = dict(
        monthly_budget=Decimal("10000"),
        max_position_pct=20.0,
        max_sector_pct=30.0,
        min_conviction=80.0,
        cash_reserve_pct=20.0,
    )
    base.update(overrides)
    return UserPolicy(**base)


def _ctx(**overrides) -> PolicyContext:
    trade_kw = overrides.pop("trade", {})
    trade = ProposedTrade(
        symbol=trade_kw.get("symbol", "TCS"),
        sector=trade_kw.get("sector", "IT"),
        side=trade_kw.get("side", TradeSide.BUY),
        value=trade_kw.get("value", Decimal("5000")),
        conviction=trade_kw.get("conviction", 85.0),
    )
    base = dict(
        total_capital=Decimal("100000"),
        cash_available=Decimal("100000"),
        sector_exposure=Decimal("0"),
        month_to_date_spend=Decimal("0"),
        trade=trade,
    )
    base.update(overrides)
    return PolicyContext(**base)


def test_clean_buy_is_allowed() -> None:
    result = PolicyEngine().evaluate(_policy(), _ctx())
    assert result.decision is Decision.ALLOW
    assert result.allowed is True
    assert result.failed_rules == []


def test_below_min_conviction_blocks() -> None:
    ctx = _ctx(trade={"conviction": 70.0})
    result = PolicyEngine().evaluate(_policy(), ctx)
    assert result.decision is Decision.BLOCK
    assert "min_conviction" in result.failed_rules


def test_position_too_large_blocks() -> None:
    # value 25000 > 20% of 100000 = 20000; budget raised so only position fails.
    ctx = _ctx(trade={"value": Decimal("25000")})
    result = PolicyEngine().evaluate(_policy(monthly_budget=Decimal("100000")), ctx)
    assert result.decision is Decision.BLOCK
    assert result.failed_rules == ["max_position_pct"]


def test_sector_breach_blocks() -> None:
    # existing 15000 + 20000 = 35000 > 30% of 100000 = 30000; position at limit.
    ctx = _ctx(
        sector_exposure=Decimal("15000"),
        trade={"value": Decimal("20000")},
    )
    result = PolicyEngine().evaluate(_policy(monthly_budget=Decimal("100000")), ctx)
    assert result.decision is Decision.BLOCK
    assert result.failed_rules == ["max_sector_pct"]


def test_cash_reserve_breach_blocks() -> None:
    # cash 25000 - 10000 = 15000 < 20% of 100000 = 20000 reserve.
    ctx = _ctx(
        cash_available=Decimal("25000"),
        trade={"value": Decimal("10000")},
    )
    result = PolicyEngine().evaluate(_policy(monthly_budget=Decimal("100000")), ctx)
    assert result.decision is Decision.BLOCK
    assert result.failed_rules == ["cash_reserve_pct"]


def test_monthly_budget_exceeded_blocks() -> None:
    ctx = _ctx(
        month_to_date_spend=Decimal("8000"),
        trade={"value": Decimal("5000")},
    )
    result = PolicyEngine().evaluate(_policy(), ctx)
    assert result.decision is Decision.BLOCK
    assert "monthly_budget" in result.failed_rules


def test_insufficient_cash_blocks() -> None:
    ctx = _ctx(
        cash_available=Decimal("3000"),
        trade={"value": Decimal("5000")},
    )
    result = PolicyEngine().evaluate(_policy(monthly_budget=Decimal("100000")), ctx)
    assert result.decision is Decision.BLOCK
    assert "sufficient_cash" in result.failed_rules


def test_sell_skips_buy_side_limits() -> None:
    # A large SELL is allowed if conviction clears the floor; deployment rules
    # do not apply to selling.
    ctx = _ctx(
        trade={"side": TradeSide.SELL, "value": Decimal("999999"), "conviction": 85.0}
    )
    result = PolicyEngine().evaluate(_policy(), ctx)
    assert result.decision is Decision.ALLOW
    assert [c.rule for c in result.checks] == ["min_conviction"]
