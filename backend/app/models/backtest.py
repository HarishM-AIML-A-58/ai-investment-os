"""SQLAlchemy ORM models for backtesting.

BacktestRun: one row per (symbol, historical_date) analysis.
BacktestLesson: LLM-generated lessons extracted from completed runs.
"""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class BacktestRun(UUIDMixin, Base):
    __tablename__ = "backtest_run"

    symbol: Mapped[str] = mapped_column(String(30), index=True)
    backtest_date: Mapped[date] = mapped_column(Date)
    recommendation_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("recommendations.id", ondelete="SET NULL"),
        nullable=True,
    )

    signal: Mapped[str | None] = mapped_column(String(10), nullable=True)     # BUY | HOLD | AVOID
    conviction: Mapped[float | None] = mapped_column(Float, nullable=True)

    entry_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    exit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    holding_days: Mapped[int] = mapped_column(Integer, default=20)

    raw_return_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    nifty50_return_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    alpha_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    outcome: Mapped[str | None] = mapped_column(String(10), nullable=True)    # WIN | LOSS | NEUTRAL
    llm_reflection: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()"
    )


class BacktestLesson(UUIDMixin, Base):
    __tablename__ = "backtest_lesson"

    symbol: Mapped[str] = mapped_column(String(30), index=True)
    lesson: Mapped[str] = mapped_column(Text)
    alpha_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    backtest_run_id: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()"
    )
