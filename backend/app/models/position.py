"""Position ORM model — tracks active portfolio holdings for risk management."""

from __future__ import annotations

from decimal import Decimal
from sqlalchemy import Float, Numeric, String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Position(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "positions"

    symbol: Mapped[str] = mapped_column(String(40), index=True, unique=True)
    exchange: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    average_price: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    
    stop_loss: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    take_profit: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    
    trailing_stop_loss_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    trailing_stop_loss_trigger: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    highest_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)  # open | closed
