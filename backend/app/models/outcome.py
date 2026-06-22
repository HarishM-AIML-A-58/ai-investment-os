"""Recommendation outcome ORM model — performance vs benchmark for learning."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class RecommendationOutcome(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "recommendation_outcomes"

    recommendation_id: Mapped[UUID] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), index=True
    )
    horizon: Mapped[str] = mapped_column(String(20))  # e.g. "1w", "1m", "3m"
    return_pct: Mapped[float] = mapped_column(Float)
    nifty_return_pct: Mapped[float] = mapped_column(Float)
    alpha: Mapped[float] = mapped_column(Float, index=True)  # return - nifty
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
