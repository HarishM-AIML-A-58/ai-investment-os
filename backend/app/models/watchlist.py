"""Watchlist ORM model — the universe the scanner sweeps."""

from __future__ import annotations

from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class WatchlistItem(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "watchlist"
    __table_args__ = (UniqueConstraint("symbol", "exchange"),)

    symbol: Mapped[str] = mapped_column(String(40), index=True)
    exchange: Mapped[str] = mapped_column(String(20), default="NSE")
    sector: Mapped[str | None] = mapped_column(String(80), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
