"""Security (instrument) master ORM model."""

from __future__ import annotations

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Security(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "securities"
    __table_args__ = (UniqueConstraint("symbol", "exchange"),)

    symbol: Mapped[str] = mapped_column(String(40), index=True)
    exchange: Mapped[str] = mapped_column(String(20))
    sector: Mapped[str | None] = mapped_column(String(80), nullable=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
