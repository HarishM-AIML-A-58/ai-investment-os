"""Market scanner — runs the decision flow across a watchlist.

This is the continuous-monitoring core: given candidates and shared policy/
account/market state, it produces a gated recommendation per symbol without any
user prompt. The Celery beat schedule drives it on an interval.
"""

from __future__ import annotations

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.llm.base import LLMClient
from app.agents.llm.embedder import Embedder
from app.decision import AccountState, DecisionInput, DecisionOutcome, MarketState
from app.decision.service import DecisionService
from app.engine.policy import UserPolicy
from app.engine.trade_guard import GuardConfig


class ScanCandidate(BaseModel):
    symbol: str
    exchange: str = "NSE"
    sector: str


async def run_scan(
    *,
    candidates: list[ScanCandidate],
    llm: LLMClient,
    session: AsyncSession,
    policy: UserPolicy,
    account: AccountState,
    market: MarketState,
    embedder: Embedder | None = None,
    guard_config: GuardConfig | None = None,
    context: str = "scheduled scan",
) -> list[DecisionOutcome]:
    service = DecisionService(guard_config)
    outcomes: list[DecisionOutcome] = []
    for candidate in candidates:
        data = DecisionInput(
            symbol=candidate.symbol,
            exchange=candidate.exchange,
            sector=candidate.sector,
            context=context,
            policy=policy,
            account=account,
            market=market,
        )
        outcome = await service.decide(
            data=data, session=session, llm=llm, embedder=embedder
        )
        outcomes.append(outcome)
    return outcomes
