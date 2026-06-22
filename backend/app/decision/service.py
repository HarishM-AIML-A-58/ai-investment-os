"""DecisionService — the end-to-end pipeline that ties the system together.

    analysis (LangGraph) → Conviction Engine → Policy Engine → Trade Guard
        → persist Recommendation with the FULL explainability trail.

This service NEVER executes. It produces a persisted, gated recommendation; a
separate, human/autonomy-governed step hands a guard-passing recommendation to
the Execution Service.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import build_graph
from app.agents.llm.base import LLMClient
from app.agents.llm.embedder import Embedder
from app.decision.models import AccountState, DecisionInput, DecisionOutcome
from app.engine.limits import money, pct_of
from app.engine.policy import PolicyContext, PolicyEngine, ProposedTrade, UserPolicy
from app.engine.trade_guard import GuardConfig, GuardContext, TradeGuard
from app.models.recommendation import (
    AgentScore,
    ConvictionBreakdown,
    PolicyEvaluation,
    Recommendation,
    TradeGuardResult,
)
from app.repositories.memory_repo import add_embedding
from app.repositories.recommendation_repo import create_recommendation
from app.repositories.security_repo import get_or_create_security


def target_position_value(policy: UserPolicy, account: AccountState) -> Decimal:
    """Deterministic position sizing.

    The candidate order is capped by the smallest of: the max-position limit,
    the remaining monthly budget, and investable cash above the reserve. A
    non-positive result means "no capital to deploy" (a valid hold-cash state).
    """
    max_position = pct_of(account.total_capital, policy.max_position_pct)
    remaining_budget = policy.monthly_budget - account.month_to_date_spend
    investable_cash = account.cash_available - pct_of(
        account.total_capital, policy.cash_reserve_pct
    )
    target = min(max_position, remaining_budget, investable_cash)
    return money(max(Decimal("0"), target))


class DecisionService:
    def __init__(self, guard_config: GuardConfig | None = None) -> None:
        self._guard_config = guard_config
        self._policy_engine = PolicyEngine()

    async def decide(
        self,
        *,
        data: DecisionInput,
        session: AsyncSession,
        llm: LLMClient,
        embedder: Embedder | None = None,
        grounding=None,
    ) -> DecisionOutcome:
        security = await get_or_create_security(
            session, symbol=data.symbol, exchange=data.exchange, sector=data.sector
        )

        # Fetch real data for strategies
        quote = None
        candles = []
        news_block = ""

        if grounding is not None:
            if hasattr(grounding, "_nse") and grounding._nse is not None:
                try:
                    quote = await grounding._nse.equity_quote(data.symbol)
                except Exception:
                    pass
            if hasattr(grounding, "_gateway") and grounding._gateway is not None:
                try:
                    candles = await grounding._gateway.get_history(data.symbol, data.exchange)
                except Exception:
                    pass
            if hasattr(grounding, "_news") and grounding._news is not None:
                try:
                    headlines = await grounding._news.fetch_headlines(query=data.symbol)
                    if headlines:
                        news_block = "\n".join(f"- {h.title}" for h in headlines[:5])
                except Exception:
                    pass

        # Compute strategies
        from app.engine.strategy.health import LongTermHealthScorer
        from app.engine.strategy.volatility import VolatilityEngine

        health_scorer = LongTermHealthScorer(llm)
        health_result = await health_scorer.analyze(data.symbol, quote, news_block)

        volatility_engine = VolatilityEngine()
        volatility_setup = volatility_engine.calculate_setup(candles)

        entry_price = None
        stop_loss = None
        target_price = None
        if volatility_setup is not None:
            entry_price = volatility_setup.entry_price
            stop_loss = volatility_setup.stop_loss
            target_price = volatility_setup.target_price

        # --- Analysis (opinions) → Conviction (math) ---
        graph = build_graph(llm, grounding=grounding)
        final = await graph.ainvoke(
            {
                "symbol": data.symbol,
                "exchange": data.exchange,
                "context": data.context,
            }
        )
        scores = final["scores"]
        conviction = final["conviction"]
        risk_score = scores["risk"].score

        agent_scores = [
            AgentScore(agent=agent, score=out.score, rationale=out.rationale,
                       report=out.report)
            for agent, out in scores.items()
        ]
        breakdown = [
            ConvictionBreakdown(
                component=c.component,
                score=c.score,
                weight=c.weight,
                contribution=c.contribution,
            )
            for c in conviction.breakdown
        ]

        # Debate layer outputs (available if debate node ran successfully)
        debate_transcript: str = final.get("debate_transcript", "")
        investment_plan: str = final.get("investment_plan", "")
        conviction_adjustment: float = final.get("conviction_adjustment", 0.0)


        target = target_position_value(data.policy, data.account)
        policy_evals: list[PolicyEvaluation] = []
        guard_results: list[TradeGuardResult] = []
        policy_allowed: bool | None = None
        guard_passed = False
        can_auto = False

        if target <= 0:
            status = "blocked_no_capital"
            policy_evals.append(
                PolicyEvaluation(
                    rule="capital_available",
                    passed=False,
                    detail="no investable capital after budget/reserve constraints",
                )
            )
        else:
            trade = ProposedTrade(
                symbol=data.symbol,
                sector=data.sector,
                side=data.side,
                value=target,
                conviction=conviction.final,
            )
            policy_ctx = PolicyContext(
                total_capital=data.account.total_capital,
                cash_available=data.account.cash_available,
                sector_exposure=data.account.sector_exposure,
                month_to_date_spend=data.account.month_to_date_spend,
                trade=trade,
            )
            policy_result = self._policy_engine.evaluate(data.policy, policy_ctx)
            policy_allowed = policy_result.allowed
            policy_evals = [
                PolicyEvaluation(rule=c.rule, passed=c.passed, detail=c.detail)
                for c in policy_result.checks
            ]

            guard = TradeGuard(self._guard_config, self._policy_engine)
            guard_ctx = GuardContext(
                policy=data.policy,
                policy_context=policy_ctx,
                risk_score=risk_score,
                market_open=data.market.market_open,
                avg_daily_value=data.market.avg_daily_value,
                trades_today=data.market.trades_today,
                deployed_today=data.market.deployed_today,
                kill_switch=data.market.kill_switch,
            )
            guard_result = guard.evaluate(guard_ctx)
            guard_passed = guard_result.passed
            can_auto = guard.can_auto_execute(guard_ctx, guard_result)
            guard_results = [
                TradeGuardResult(check_name=c.name, passed=c.passed, detail=c.detail)
                for c in guard_result.checks
            ]
            status = "guard_passed" if guard_passed else "blocked"

        # Generate dynamic one-line AI impact and rationale summary
        summary_system = (
            "You are the AI Decision Summarizer of an advanced agentic trading system.\n"
            "Your job is to write a single-sentence, concise executive summary (maximum 25 words) explaining why a trade recommendation was either Accepted or Blocked.\n"
            "Formatting requirements:\n"
            "1. If the status is 'guard_passed', start the sentence with 'Accepted: '. Explain why it passed based on positive analyst consensus (e.g. technical breakout, fundamental value).\n"
            "2. If the status is not 'guard_passed', start the sentence with 'Blocked: '. Explain the primary reason it was blocked (e.g. failed risk limits, low conviction, capital constraints, or 'avoid' action).\n"
            "3. Return ONLY the plain text sentence, no markdown, no quotes, no extra text."
        )

        agent_summary_text = "\n".join(
            f"- {a.capitalize()} score: {o.score:.0f} ({o.rationale})"
            for a, o in scores.items()
        )
        policy_summary_text = "\n".join(
            f"- Rule '{p.rule}': {'Passed' if p.passed else 'FAILED'} ({p.detail})"
            for p in policy_evals
        )
        guard_summary_text = "\n".join(
            f"- Guard '{g.check_name}': {'Passed' if g.passed else 'FAILED'} ({g.detail})"
            for g in guard_results
        )

        summary_user = (
            f"Asset: {data.symbol}\n"
            f"Action: {conviction.band.value}\n"
            f"Conviction Score: {conviction.final:.0f}%\n"
            f"Decision Status: {status}\n\n"
            f"Analyst Opinions:\n{agent_summary_text}\n\n"
            f"Policy Checks:\n{policy_summary_text}\n\n"
            f"Trade Guard Checks:\n{guard_summary_text}"
        )

        try:
            dynamic_thesis = await llm.summarize(system=summary_system, user=summary_user)
            dynamic_thesis = dynamic_thesis.strip("\"'")
        except Exception:
            if status == "guard_passed":
                dynamic_thesis = f"Accepted: Passed risk and policy gates for {data.symbol} with {conviction.final:.0f}% conviction."
            else:
                dynamic_thesis = f"Blocked: Failed safety gates or insufficient conviction for {data.symbol}."

        # Serialize metadata into thesis field
        import json
        metadata_dict = {
            "health_score": health_result.health_score,
            "is_value_trap": health_result.is_value_trap,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "target_price": target_price,
        }
        recommendation_thesis = f"{dynamic_thesis}\n[Metadata] {json.dumps(metadata_dict)}"

        recommendation = Recommendation(
            security_id=security.id,
            action=conviction.band.value,
            conviction=conviction.final,
            base_score=conviction.base,
            band=conviction.band.value,
            engine_version=conviction.engine_version,
            status=status,
            thesis=recommendation_thesis,
            agent_scores=agent_scores,
            conviction_breakdown=breakdown,
            policy_evaluations=policy_evals,
            trade_guard_results=guard_results,
        )
        recommendation = await create_recommendation(session, recommendation)


        # Semantic memory: embed the thesis for later recall (best-effort).
        if embedder is not None:
            content = dynamic_thesis or f"{data.symbol} recommendation"
            vector = await embedder.embed(content)
            await add_embedding(
                session,
                kind="recommendation",
                content=content,
                embedding=vector,
                ref_id=recommendation.id,
                meta={"symbol": data.symbol, "conviction": conviction.final},
            )

        return DecisionOutcome(
            recommendation_id=recommendation.id,
            action=recommendation.action,
            conviction=recommendation.conviction,
            status=status,
            target_value=target,
            policy_allowed=policy_allowed,
            guard_passed=guard_passed,
            can_auto_execute=can_auto,
            health_score=health_result.health_score,
            is_value_trap=health_result.is_value_trap,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
        )
