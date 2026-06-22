"""DB access layer for backtest_run and backtest_lesson tables."""

from __future__ import annotations

from datetime import date
from uuid import UUID, uuid4

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.backtest import BacktestLesson, BacktestRun


# ── BacktestRun ──────────────────────────────────────────────────────────────

async def create_backtest_run(
    session: AsyncSession,
    symbol: str,
    backtest_date: date,
    holding_days: int = 20,
) -> BacktestRun:
    run = BacktestRun(
        id=uuid4(),
        symbol=symbol,
        backtest_date=backtest_date,
        holding_days=holding_days,
        status="pending",
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)
    return run


async def update_backtest_run(
    session: AsyncSession,
    run_id: UUID,
    *,
    recommendation_id: UUID | None = None,
    signal: str | None = None,
    conviction: float | None = None,
    entry_price: float | None = None,
    exit_price: float | None = None,
    raw_return_pct: float | None = None,
    nifty50_return_pct: float | None = None,
    alpha_pct: float | None = None,
    outcome: str | None = None,
    llm_reflection: str | None = None,
    status: str = "complete",
    error_detail: str | None = None,
) -> None:
    run = await session.get(BacktestRun, run_id)
    if run is None:
        return
    if recommendation_id is not None:
        run.recommendation_id = recommendation_id
    if signal is not None:
        run.signal = signal
    if conviction is not None:
        run.conviction = conviction
    if entry_price is not None:
        run.entry_price = entry_price
    if exit_price is not None:
        run.exit_price = exit_price
    if raw_return_pct is not None:
        run.raw_return_pct = raw_return_pct
    if nifty50_return_pct is not None:
        run.nifty50_return_pct = nifty50_return_pct
    if alpha_pct is not None:
        run.alpha_pct = alpha_pct
    if outcome is not None:
        run.outcome = outcome
    if llm_reflection is not None:
        run.llm_reflection = llm_reflection
    run.status = status
    if error_detail is not None:
        run.error_detail = error_detail
    await session.commit()


async def list_backtest_runs(
    session: AsyncSession,
    symbol: str,
    limit: int = 100,
) -> list[BacktestRun]:
    result = await session.execute(
        select(BacktestRun)
        .where(BacktestRun.symbol == symbol)
        .order_by(BacktestRun.backtest_date.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_backtest_stats(session: AsyncSession, symbol: str) -> dict:
    """Aggregate win rate, avg alpha, avg raw return for a symbol."""
    result = await session.execute(
        select(
            func.count(BacktestRun.id).label("total"),
            func.avg(BacktestRun.raw_return_pct).label("avg_raw"),
            func.avg(BacktestRun.alpha_pct).label("avg_alpha"),
            func.sum(
                case((BacktestRun.outcome == "WIN", 1), else_=0)
            ).label("wins"),
            func.sum(
                case((BacktestRun.outcome == "LOSS", 1), else_=0)
            ).label("losses"),
        )
        .where(
            BacktestRun.symbol == symbol,
            BacktestRun.status == "complete",
        )
    )
    row = result.one()
    total = row.total or 0
    return {
        "total_runs": total,
        "avg_raw_return": round(row.avg_raw or 0.0, 4),
        "avg_alpha": round(row.avg_alpha or 0.0, 4),
        "win_rate": round((row.wins or 0) / total, 3) if total > 0 else 0.0,
        "wins": row.wins or 0,
        "losses": row.losses or 0,
    }


# ── BacktestLesson ───────────────────────────────────────────────────────────

async def store_lesson(
    session: AsyncSession,
    symbol: str,
    lesson: str,
    alpha_pct: float | None = None,
    backtest_run_id: UUID | None = None,
) -> BacktestLesson:
    bl = BacktestLesson(
        id=uuid4(),
        symbol=symbol,
        lesson=lesson,
        alpha_pct=alpha_pct,
        backtest_run_id=backtest_run_id,
    )
    session.add(bl)
    await session.commit()
    await session.refresh(bl)
    return bl


async def get_lessons_for_symbol(
    session: AsyncSession,
    symbol: str,
    limit: int = 5,
) -> list[BacktestLesson]:
    """Return the most recent meaningful lessons for a symbol."""
    result = await session.execute(
        select(BacktestLesson)
        .where(BacktestLesson.symbol == symbol)
        .order_by(BacktestLesson.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
