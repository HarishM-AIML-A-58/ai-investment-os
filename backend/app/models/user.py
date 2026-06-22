"""User and user-policy ORM models."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True)

    policy: Mapped["UserPolicyModel | None"] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class UserPolicyModel(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "user_policies"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    monthly_budget: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    risk_profile: Mapped[str] = mapped_column(String(20), default="moderate")
    max_position_pct: Mapped[float] = mapped_column(Float, default=20.0)
    max_sector_pct: Mapped[float] = mapped_column(Float, default=30.0)
    min_conviction: Mapped[float] = mapped_column(Float, default=80.0)
    cash_reserve_pct: Mapped[float] = mapped_column(Float, default=20.0)
    auto_execute: Mapped[bool] = mapped_column(Boolean, default=False)
    autonomy_tier: Mapped[int] = mapped_column(Integer, default=0)

    # Drawdown circuit breaker — persisted so worker restarts don't reset it
    kill_switch: Mapped[bool] = mapped_column(Boolean, default=False)
    max_drawdown_pct: Mapped[float] = mapped_column(Float, default=0.0)
    drawdown_peak_pnl: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    drawdown_peak_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

    user: Mapped["User"] = relationship(back_populates="policy", lazy="selectin")
