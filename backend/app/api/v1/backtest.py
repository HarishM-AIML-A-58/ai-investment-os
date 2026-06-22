"""FastAPI router for backtesting endpoints.

Endpoints:
  POST /backtest/run          — queue a backtest (one date or date range)
  GET  /backtest/{symbol}     — summary stats for a symbol
  GET  /backtest/{symbol}/runs — paginated list of runs
  GET  /backtest/{symbol}/lessons — LLM-generated lessons
"""

from __future__ import annotations

from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.jobs.backtest_task import run_backtest_task
from app.repositories.backtest_repo import (
    get_backtest_stats,
    get_lessons_for_symbol,
    list_backtest_runs,
)
from app.repositories.security_repo import get_security_by_symbol

router = APIRouter(prefix="/backtest", tags=["backtest"])


# ── Request / Response schemas ─────────────────────────────────────────────

class BacktestRunRequest(BaseModel):
    symbol: str
    start_date: date
    end_date: date
    holding_days: int = 20
    frequency: str = "weekly"   # "daily" | "weekly" | "monthly"


class QueuedTask(BaseModel):
    date: str
    task_id: str


class BacktestQueueResponse(BaseModel):
    symbol: str
    queued: int
    tasks: list[QueuedTask]


class BacktestRunSummary(BaseModel):
    id: UUID
    backtest_date: date
    signal: str | None
    conviction: float | None
    entry_price: float | None
    exit_price: float | None
    raw_return_pct: float | None
    nifty50_return_pct: float | None
    alpha_pct: float | None
    outcome: str | None
    llm_reflection: str | None
    status: str


class BacktestStats(BaseModel):
    symbol: str
    total_runs: int
    avg_raw_return: float
    avg_alpha: float
    win_rate: float
    wins: int
    losses: int


class LessonOut(BaseModel):
    id: UUID
    symbol: str
    lesson: str
    alpha_pct: float | None
    created_at: str


# ── Helpers ─────────────────────────────────────────────────────────────────

def _build_dates(start: date, end: date, frequency: str) -> list[date]:
    """Generate backtest dates within range according to frequency."""
    step_map = {"daily": 1, "weekly": 7, "monthly": 30}
    step = timedelta(days=step_map.get(frequency, 7))
    dates, current = [], start
    while current <= end:
        if current.weekday() < 5:  # skip weekends
            dates.append(current)
        current += step
    return dates


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("/run", response_model=BacktestQueueResponse)
async def queue_backtest(
    req: BacktestRunRequest,
    db: AsyncSession = Depends(get_db),
) -> BacktestQueueResponse:
    """Queue backtest tasks for a symbol over a date range."""
    security = await get_security_by_symbol(db, req.symbol)
    if security is None:
        raise HTTPException(
            status_code=404,
            detail=f"Security '{req.symbol}' not found in watchlist. Add it first.",
        )

    dates = _build_dates(req.start_date, req.end_date, req.frequency)
    if not dates:
        raise HTTPException(status_code=400, detail="No valid trading dates in range.")
    if len(dates) > 100:
        raise HTTPException(
            status_code=400,
            detail=f"Too many dates ({len(dates)}). Limit to 100 per request.",
        )

    tasks = []
    for d in dates:
        task = run_backtest_task.delay(
            symbol=req.symbol,
            backtest_date_str=d.isoformat(),
            security_id_str=str(security.id),
            holding_days=req.holding_days,
        )
        tasks.append(QueuedTask(date=d.isoformat(), task_id=task.id))

    return BacktestQueueResponse(
        symbol=req.symbol,
        queued=len(tasks),
        tasks=tasks,
    )


@router.get("/{symbol}", response_model=BacktestStats)
async def backtest_stats(
    symbol: str,
    db: AsyncSession = Depends(get_db),
) -> BacktestStats:
    """Aggregate win rate, average alpha, and return stats for a symbol."""
    stats = await get_backtest_stats(db, symbol.upper())
    return BacktestStats(symbol=symbol.upper(), **stats)


@router.get("/{symbol}/runs", response_model=list[BacktestRunSummary])
async def backtest_runs(
    symbol: str,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[BacktestRunSummary]:
    """Paginated list of individual backtest runs for a symbol."""
    runs = await list_backtest_runs(db, symbol.upper(), limit=limit)
    return [
        BacktestRunSummary(
            id=r.id,
            backtest_date=r.backtest_date,
            signal=r.signal,
            conviction=r.conviction,
            entry_price=r.entry_price,
            exit_price=r.exit_price,
            raw_return_pct=r.raw_return_pct,
            nifty50_return_pct=r.nifty50_return_pct,
            alpha_pct=r.alpha_pct,
            outcome=r.outcome,
            llm_reflection=r.llm_reflection,
            status=r.status,
        )
        for r in runs
    ]


@router.get("/{symbol}/lessons", response_model=list[LessonOut])
async def backtest_lessons(
    symbol: str,
    limit: int = Query(default=10, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[LessonOut]:
    """LLM-generated lessons from past backtest outcomes for a symbol."""
    lessons = await get_lessons_for_symbol(db, symbol.upper(), limit=limit)
    return [
        LessonOut(
            id=l.id,
            symbol=l.symbol,
            lesson=l.lesson,
            alpha_pct=l.alpha_pct,
            created_at=l.created_at.isoformat(),
        )
        for l in lessons
    ]
