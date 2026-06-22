"""Trade Guard — the final deterministic gate.

Every trade must pass all seven checks AND a circuit-breaker pre-flight before
execution. The guard is defence-in-depth: it re-verifies budget/exposure limits
independently and also requires the Policy Engine to ALLOW. Buy-side limits
(budget, portfolio/sector exposure) are skipped for SELL trades; risk, market
hours, liquidity and policy apply to both sides.
"""

from __future__ import annotations

from app.domain.enums import AutonomyTier, TradeSide
from app.engine.limits import money, pct_of
from app.engine.policy.engine import PolicyEngine
from app.engine.trade_guard.models import (
    GuardCheck,
    GuardConfig,
    GuardContext,
    GuardResult,
)


class TradeGuard:
    def __init__(
        self,
        config: GuardConfig | None = None,
        policy_engine: PolicyEngine | None = None,
    ) -> None:
        self.config = config or GuardConfig()
        self.policy_engine = policy_engine or PolicyEngine()

    def evaluate(self, ctx: GuardContext) -> GuardResult:
        # --- Circuit-breaker pre-flight (hard stop) ---
        breaker = self._circuit_breaker(ctx)
        if breaker is not None:
            return GuardResult(
                passed=False,
                circuit_breaker_tripped=True,
                checks=[breaker],
            )

        trade = ctx.policy_context.trade
        is_buy = trade.side is TradeSide.BUY
        pc = ctx.policy_context
        policy = ctx.policy
        checks: list[GuardCheck] = []

        # 1. Budget (buy-side only)
        if is_buy:
            mtd_after = money(pc.month_to_date_spend + trade.value)
            checks.append(
                GuardCheck(
                    name="budget",
                    passed=mtd_after <= policy.monthly_budget,
                    detail=f"mtd+order {mtd_after} vs budget {money(policy.monthly_budget)}",
                )
            )

        # 2. Risk (both sides)
        checks.append(
            GuardCheck(
                name="risk",
                passed=ctx.risk_score >= self.config.risk_floor,
                detail=f"risk {ctx.risk_score:.1f} vs floor {self.config.risk_floor:.1f}",
            )
        )

        # 3. Portfolio (position) exposure (buy-side only)
        if is_buy:
            max_position = money(pct_of(pc.total_capital, policy.max_position_pct))
            checks.append(
                GuardCheck(
                    name="portfolio_exposure",
                    passed=trade.value <= max_position,
                    detail=f"order {money(trade.value)} vs max position {max_position}",
                )
            )

        # 4. Sector exposure (buy-side only)
        if is_buy:
            max_sector = money(pct_of(pc.total_capital, policy.max_sector_pct))
            resulting = money(pc.sector_exposure + trade.value)
            checks.append(
                GuardCheck(
                    name="sector_exposure",
                    passed=resulting <= max_sector,
                    detail=f"resulting sector {resulting} vs max {max_sector}",
                )
            )

        # 5. Policy (both sides) — independent ALLOW required
        policy_result = self.policy_engine.evaluate(policy, pc)
        checks.append(
            GuardCheck(
                name="policy",
                passed=policy_result.allowed,
                detail=(
                    "policy ALLOW"
                    if policy_result.allowed
                    else f"policy BLOCK: {', '.join(policy_result.failed_rules)}"
                ),
            )
        )

        # 6. Market hours (both sides)
        checks.append(
            GuardCheck(
                name="market_hours",
                passed=ctx.market_open,
                detail="market open" if ctx.market_open else "market closed",
            )
        )

        # 7. Liquidity (both sides)
        liquidity_cap = money(
            pct_of(ctx.avg_daily_value, self.config.max_adv_participation_pct)
        )
        checks.append(
            GuardCheck(
                name="liquidity",
                passed=trade.value <= liquidity_cap,
                detail=(
                    f"order {money(trade.value)} vs liquidity cap {liquidity_cap} "
                    f"({self.config.max_adv_participation_pct:.2f}% of ADV)"
                ),
            )
        )

        return GuardResult(
            passed=all(c.passed for c in checks),
            circuit_breaker_tripped=False,
            checks=checks,
        )

    def _circuit_breaker(self, ctx: GuardContext) -> GuardCheck | None:
        """Return a failing check if the breaker trips, else ``None``."""
        if ctx.kill_switch:
            return GuardCheck(
                name="circuit_breaker",
                passed=False,
                detail="kill switch engaged — all execution halted",
            )
        if ctx.trades_today >= self.config.max_trades_per_day:
            return GuardCheck(
                name="circuit_breaker",
                passed=False,
                detail=(
                    f"daily trade limit reached "
                    f"({ctx.trades_today}/{self.config.max_trades_per_day})"
                ),
            )
        trade = ctx.policy_context.trade
        if trade.side is TradeSide.BUY:
            deployed_after = money(ctx.deployed_today + trade.value)
            if deployed_after > self.config.max_daily_deployment:
                return GuardCheck(
                    name="circuit_breaker",
                    passed=False,
                    detail=(
                        f"daily deployment cap exceeded: {deployed_after} vs "
                        f"{money(self.config.max_daily_deployment)}"
                    ),
                )
        return None

    def can_auto_execute(self, ctx: GuardContext, result: GuardResult) -> bool:
        """Whether a guard-passing trade may fire without human confirmation.

        Authority is governed by the autonomy tier; auto-execution also requires
        ``auto_execute`` to be enabled and the guard to have passed.
        """
        if not result.passed or not ctx.policy.auto_execute:
            return False

        tier = ctx.policy.autonomy_tier
        if tier is AutonomyTier.PROPOSE:
            return False
        if tier is AutonomyTier.FULL:
            return True

        # CAPPED tier: bounded by per-trade value cap and conviction floor.
        trade = ctx.policy_context.trade
        return (
            trade.value <= self.config.tier1_max_value
            and trade.conviction >= self.config.tier1_min_conviction
        )
