"""Trade Guard unit tests (pure, deterministic)."""

from __future__ import annotations

from decimal import Decimal

from app.domain.enums import AutonomyTier, TradeSide
from app.engine.policy import PolicyContext, ProposedTrade, UserPolicy
from app.engine.trade_guard import GuardContext, GuardResult, TradeGuard


def _guard_ctx(**overrides) -> GuardContext:
    policy_over = overrides.pop("policy", {})
    trade_over = overrides.pop("trade", {})
    pctx_over = overrides.pop("policy_context", {})

    policy = UserPolicy(
        monthly_budget=Decimal("10000"),
        max_position_pct=20.0,
        max_sector_pct=30.0,
        min_conviction=80.0,
        cash_reserve_pct=20.0,
        auto_execute=policy_over.get("auto_execute", False),
        autonomy_tier=policy_over.get("autonomy_tier", AutonomyTier.PROPOSE),
    )
    trade = ProposedTrade(
        symbol="TCS",
        sector="IT",
        side=trade_over.get("side", TradeSide.BUY),
        value=trade_over.get("value", Decimal("1000")),
        conviction=trade_over.get("conviction", 90.0),
    )
    policy_context = PolicyContext(
        total_capital=Decimal("100000"),
        cash_available=Decimal("100000"),
        sector_exposure=pctx_over.get("sector_exposure", Decimal("0")),
        month_to_date_spend=pctx_over.get("month_to_date_spend", Decimal("0")),
        trade=trade,
    )
    base = dict(
        policy=policy,
        policy_context=policy_context,
        risk_score=overrides.pop("risk_score", 80.0),
        market_open=overrides.pop("market_open", True),
        avg_daily_value=overrides.pop("avg_daily_value", Decimal("10000000")),
        trades_today=overrides.pop("trades_today", 0),
        deployed_today=overrides.pop("deployed_today", Decimal("0")),
        kill_switch=overrides.pop("kill_switch", False),
    )
    return GuardContext(**base)


def test_clean_buy_passes_all_seven_checks() -> None:
    result = TradeGuard().evaluate(_guard_ctx())
    assert result.passed is True
    assert result.circuit_breaker_tripped is False
    assert len(result.checks) == 7
    assert result.failed_checks == []


def test_market_closed_fails() -> None:
    result = TradeGuard().evaluate(_guard_ctx(market_open=False))
    assert result.passed is False
    assert "market_hours" in result.failed_checks


def test_risk_below_floor_fails() -> None:
    result = TradeGuard().evaluate(_guard_ctx(risk_score=30.0))
    assert result.passed is False
    assert "risk" in result.failed_checks


def test_liquidity_exceeded_fails() -> None:
    # cap = 1% of 50000 = 500; order 1000 > 500
    result = TradeGuard().evaluate(
        _guard_ctx(avg_daily_value=Decimal("50000"), trade={"value": Decimal("1000")})
    )
    assert result.passed is False
    assert "liquidity" in result.failed_checks


def test_policy_block_propagates() -> None:
    result = TradeGuard().evaluate(_guard_ctx(trade={"conviction": 50.0}))
    assert result.passed is False
    assert "policy" in result.failed_checks


def test_circuit_breaker_kill_switch() -> None:
    result = TradeGuard().evaluate(_guard_ctx(kill_switch=True))
    assert result.passed is False
    assert result.circuit_breaker_tripped is True
    assert result.failed_checks == ["circuit_breaker"]


def test_circuit_breaker_max_trades() -> None:
    result = TradeGuard().evaluate(_guard_ctx(trades_today=10))
    assert result.circuit_breaker_tripped is True
    assert result.passed is False


def test_circuit_breaker_daily_deployment() -> None:
    # deployed 99500 + order 1000 = 100500 > default cap 100000
    result = TradeGuard().evaluate(
        _guard_ctx(deployed_today=Decimal("99500"), trade={"value": Decimal("1000")})
    )
    assert result.circuit_breaker_tripped is True
    assert result.passed is False


# --- Auto-execution authority ---


def _passing(ctx: GuardContext) -> tuple[TradeGuard, GuardResult]:
    guard = TradeGuard()
    return guard, guard.evaluate(ctx)


def test_propose_tier_never_auto_executes() -> None:
    ctx = _guard_ctx(policy={"auto_execute": True, "autonomy_tier": AutonomyTier.PROPOSE})
    guard, result = _passing(ctx)
    assert result.passed is True
    assert guard.can_auto_execute(ctx, result) is False


def test_full_tier_auto_executes_when_enabled() -> None:
    ctx = _guard_ctx(policy={"auto_execute": True, "autonomy_tier": AutonomyTier.FULL})
    guard, result = _passing(ctx)
    assert guard.can_auto_execute(ctx, result) is True


def test_auto_execute_disabled_blocks_autofire() -> None:
    ctx = _guard_ctx(policy={"auto_execute": False, "autonomy_tier": AutonomyTier.FULL})
    guard, result = _passing(ctx)
    assert guard.can_auto_execute(ctx, result) is False


def test_capped_tier_within_envelope() -> None:
    ctx = _guard_ctx(
        policy={"auto_execute": True, "autonomy_tier": AutonomyTier.CAPPED},
        trade={"value": Decimal("1000"), "conviction": 90.0},
    )
    guard, result = _passing(ctx)
    assert guard.can_auto_execute(ctx, result) is True


def test_capped_tier_value_over_cap() -> None:
    # value 3000 > tier1_max_value 2000; but must still pass the guard, so keep
    # within position/budget limits by raising budget via a larger ADV is N/A —
    # 3000 is within 20% position (20000) and budget (10000) here.
    ctx = _guard_ctx(
        policy={"auto_execute": True, "autonomy_tier": AutonomyTier.CAPPED},
        trade={"value": Decimal("3000"), "conviction": 90.0},
    )
    guard, result = _passing(ctx)
    assert result.passed is True
    assert guard.can_auto_execute(ctx, result) is False


def test_capped_tier_conviction_below_floor() -> None:
    ctx = _guard_ctx(
        policy={"auto_execute": True, "autonomy_tier": AutonomyTier.CAPPED},
        trade={"value": Decimal("1000"), "conviction": 82.0},
    )
    guard, result = _passing(ctx)
    # conviction 82 >= policy min 80 so guard passes, but < tier1 floor 85
    assert result.passed is True
    assert guard.can_auto_execute(ctx, result) is False
