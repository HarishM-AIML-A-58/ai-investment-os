"""Policy Engine — deterministic rule evaluation. No LLM. Can override AI.

Capital-deployment limits (position size, sector exposure, cash reserve, budget,
sufficient cash) apply only to BUY trades. A SELL reduces exposure and is not
constrained by these deployment rules. The minimum-conviction rule applies to
every actionable trade.
"""

from __future__ import annotations

from app.domain.enums import Decision, TradeSide
from app.engine.limits import money, pct_of
from app.engine.policy.models import (
    PolicyCheck,
    PolicyContext,
    PolicyResult,
    UserPolicy,
)


class PolicyEngine:
    def evaluate(self, policy: UserPolicy, ctx: PolicyContext) -> PolicyResult:
        trade = ctx.trade
        checks: list[PolicyCheck] = []

        # --- Rule: minimum conviction (applies to all actionable trades) ---
        checks.append(
            PolicyCheck(
                rule="min_conviction",
                passed=trade.conviction >= policy.min_conviction,
                detail=(
                    f"conviction {trade.conviction:.1f} "
                    f"vs min {policy.min_conviction:.1f}"
                ),
            )
        )

        if trade.side is TradeSide.BUY:
            checks.extend(self._buy_rules(policy, ctx))

        decision = (
            Decision.ALLOW if all(c.passed for c in checks) else Decision.BLOCK
        )
        return PolicyResult(decision=decision, checks=checks)

    def _buy_rules(
        self, policy: UserPolicy, ctx: PolicyContext
    ) -> list[PolicyCheck]:
        trade = ctx.trade
        value = trade.value

        max_position = money(pct_of(ctx.total_capital, policy.max_position_pct))
        max_sector = money(pct_of(ctx.total_capital, policy.max_sector_pct))
        required_reserve = money(pct_of(ctx.total_capital, policy.cash_reserve_pct))
        resulting_sector = money(ctx.sector_exposure + value)
        cash_after = money(ctx.cash_available - value)
        mtd_after = money(ctx.month_to_date_spend + value)

        return [
            PolicyCheck(
                rule="sufficient_cash",
                passed=value <= ctx.cash_available,
                detail=f"order {money(value)} vs cash {money(ctx.cash_available)}",
            ),
            PolicyCheck(
                rule="max_position_pct",
                passed=value <= max_position,
                detail=(
                    f"order {money(value)} vs max position {max_position} "
                    f"({policy.max_position_pct:.1f}% of capital)"
                ),
            ),
            PolicyCheck(
                rule="max_sector_pct",
                passed=resulting_sector <= max_sector,
                detail=(
                    f"resulting sector exposure {resulting_sector} vs max "
                    f"{max_sector} ({policy.max_sector_pct:.1f}% of capital)"
                ),
            ),
            PolicyCheck(
                rule="cash_reserve_pct",
                passed=cash_after >= required_reserve,
                detail=(
                    f"cash after trade {cash_after} vs required reserve "
                    f"{required_reserve} ({policy.cash_reserve_pct:.1f}% of capital)"
                ),
            ),
            PolicyCheck(
                rule="monthly_budget",
                passed=mtd_after <= policy.monthly_budget,
                detail=(
                    f"month-to-date+order {mtd_after} vs budget "
                    f"{money(policy.monthly_budget)}"
                ),
            ),
        ]
