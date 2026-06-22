"""Order ORM model — the audit record of a (human-approved) execution."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, String, Numeric, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Order(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "orders"

    recommendation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("recommendations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True)
    symbol: Mapped[str] = mapped_column(String(40))
    exchange: Mapped[str] = mapped_column(String(20))
    side: Mapped[str] = mapped_column(String(10))
    quantity: Mapped[int] = mapped_column(Integer)
    order_type: Mapped[str] = mapped_column(String(20), default="MARKET")
    price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    stop_loss: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    take_profit: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    trailing_stop_loss_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    trailing_stop_loss_trigger: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    parent_order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    broker_order_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)

