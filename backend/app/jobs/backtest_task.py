"""Celery task: run the full agent pipeline on a historical date for backtesting.

This task:
1. Creates a BacktestRun record (status=pending)
2. Runs the full 6-analyst + debate pipeline as-of the historical date
3. Fetches actual entry/exit prices from the OpenAlgo gateway
4. Computes raw return and alpha vs NIFTY50
5. Runs LLM reflection on the outcome
6. Stores results and extracts lessons

Lessons are injected into future run_analysis() calls via get_lessons_for_symbol().
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date, timedelta
from uuid import UUID, uuid4

from app.jobs.celery_app import celery_app

logger = logging.getLogger(__name__)

_REFLECTION_SYSTEM = """\
You are a trading analyst reviewing your own past decision now that the actual outcome is known.
Write exactly 2-4 sentences of plain prose (no bullets, no headers, no markdown).

Cover in order:
1. Was the directional call (BUY/HOLD/AVOID) correct? State the actual alpha vs NIFTY50.
2. Which part of the thesis held or failed? Cite the specific analyst score that was most wrong.
3. One concrete, actionable lesson for future analyses of similar Indian equities.

Be terse and specific. Your output will be stored verbatim and re-read by future agents."""

_REFLECTION_USER = """\
Symbol: {symbol}
Signal: {signal}
Conviction: {conviction:.1f}
Holding Period: {holding_days} trading days
Raw Return: {raw_return:+.1%}
NIFTY50 Return (same period): {nifty_return:+.1%}
Alpha: {alpha:+.1%}
Outcome: {outcome}

Investment Plan (Research Manager verdict at time of signal):
{investment_plan}

Agent Scores at time of signal:
{agent_scores}"""


@celery_app.task(
    name="app.jobs.run_backtest",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def run_backtest_task(
    self,
    symbol: str,
    backtest_date_str: str,
    security_id_str: str,
    holding_days: int = 20,
):
    """Celery entry point — wraps the async implementation."""
    try:
        asyncio.run(
            _run_backtest_async(
                symbol=symbol,
                backtest_date_str=backtest_date_str,
                security_id_str=security_id_str,
                holding_days=holding_days,
            )
        )
    except Exception as exc:
        logger.error("Backtest task failed for %s %s: %s", symbol, backtest_date_str, exc)
        raise self.retry(exc=exc)


async def _run_backtest_async(
    symbol: str,
    backtest_date_str: str,
    security_id_str: str,
    holding_days: int,
) -> None:
    """Full async backtesting pipeline."""
    from app.agents.llm.azure import AzureLLM
    from app.agents.orchestrator import run_analysis
    from app.db.session import AsyncSessionLocal
    from app.marketdata.historical import (
        classify_outcome,
        compute_return,
        get_close_price_on_date,
        get_nifty50_close_on_date,
    )
    from app.repositories.backtest_repo import (
        create_backtest_run,
        get_lessons_for_symbol,
        store_lesson,
        update_backtest_run,
    )

    backtest_date = date.fromisoformat(backtest_date_str)
    exit_date = backtest_date + timedelta(days=holding_days)
    security_id = UUID(security_id_str)

    async with AsyncSessionLocal() as session:
        # 1. Create pending run record
        run = await create_backtest_run(
            session, symbol, backtest_date, holding_days
        )

        try:
            # 2. Fetch past lessons and inject into context
            lessons = await get_lessons_for_symbol(session, symbol, limit=5)
            lesson_block = ""
            if lessons:
                lesson_block = "\n\nLESSONS FROM PAST ANALYSES (apply to current analysis):\n"
                lesson_block += "\n".join(f"- {l.lesson}" for l in lessons)

            context = (
                f"Backtest mode: analyse {symbol} as of {backtest_date}. "
                f"Use only information that would have been available on that date."
                f"{lesson_block}"
            )

            # 3. Run full agent pipeline
            llm = AzureLLM()
            rec = await run_analysis(
                symbol=symbol,
                security_id=security_id,
                llm=llm,
                session=session,
                context=context,
            )

            # 4. Fetch actual prices
            entry_price = await get_close_price_on_date(symbol, backtest_date)
            exit_price  = await get_close_price_on_date(symbol, exit_date)
            nifty_entry = await get_nifty50_close_on_date(backtest_date)
            nifty_exit  = await get_nifty50_close_on_date(exit_date)

            if entry_price and exit_price and nifty_entry and nifty_exit:
                raw_return   = compute_return(entry_price, exit_price)
                nifty_return = compute_return(nifty_entry, nifty_exit)
                alpha        = raw_return - nifty_return
                outcome      = classify_outcome(raw_return, nifty_return)

                # 5. LLM reflection on the outcome
                agent_scores_str = "; ".join(
                    f"{s.agent}: {s.score:.0f}" for s in rec.agent_scores
                )
                reflection_user = _REFLECTION_USER.format(
                    symbol=symbol,
                    signal=rec.signal if hasattr(rec, "signal") else rec.action,
                    conviction=rec.conviction,
                    holding_days=holding_days,
                    raw_return=raw_return,
                    nifty_return=nifty_return,
                    alpha=alpha,
                    outcome=outcome,
                    investment_plan=rec.investment_plan or "Not available",
                    agent_scores=agent_scores_str,
                )
                reflection = await llm.generate(
                    system=_REFLECTION_SYSTEM,
                    user=reflection_user,
                )

                # 6. Update run with full results
                await update_backtest_run(
                    session, run.id,
                    recommendation_id=rec.id,
                    signal=rec.action,
                    conviction=rec.conviction,
                    entry_price=entry_price,
                    exit_price=exit_price,
                    raw_return_pct=raw_return,
                    nifty50_return_pct=nifty_return,
                    alpha_pct=alpha,
                    outcome=outcome,
                    llm_reflection=reflection,
                    status="complete",
                )

                # 7. Store lesson if alpha is meaningful (>2%)
                if abs(alpha) > 0.02:
                    await store_lesson(
                        session,
                        symbol=symbol,
                        lesson=reflection,
                        alpha_pct=alpha,
                        backtest_run_id=run.id,
                    )
                    logger.info(
                        "Lesson stored for %s (alpha: %+.1%%)", symbol, alpha * 100
                    )
            else:
                logger.warning(
                    "Could not fetch prices for %s between %s and %s",
                    symbol, backtest_date, exit_date,
                )
                await update_backtest_run(
                    session, run.id,
                    recommendation_id=rec.id,
                    signal=rec.action,
                    conviction=rec.conviction,
                    status="complete",
                    error_detail="Price data unavailable for return calculation",
                )

        except Exception as exc:
            logger.error("Backtest failed for %s %s: %s", symbol, backtest_date, exc)
            await update_backtest_run(
                session, run.id,
                status="error",
                error_detail=str(exc),
            )
            raise
