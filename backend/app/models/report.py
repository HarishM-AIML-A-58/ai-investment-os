"""Daily intelligence report ORM model."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Report(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "reports"
    __table_args__ = (UniqueConstraint("report_date", "report_type"),)

    report_date: Mapped[date] = mapped_column(Date, index=True)
    report_type: Mapped[str] = mapped_column(String(20))  # morning | evening
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
