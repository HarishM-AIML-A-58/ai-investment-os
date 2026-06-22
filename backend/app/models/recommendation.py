"""Recommendation and its full explainability trail.

A recommendation persists *why* it was made: per-agent scores (with full reports),
the conviction breakdown, the bull/bear debate transcript, the Research Manager
investment plan, every policy evaluation, and every Trade Guard check. This makes
"explain this recommendation" a pure database read.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Recommendation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "recommendations"

    security_id: Mapped[UUID] = mapped_column(
        ForeignKey("securities.id", ondelete="RESTRICT"), index=True
    )
    action: Mapped[str] = mapped_column(String(10))  # buy | hold | avoid
    conviction: Mapped[float] = mapped_column(Float, index=True)
    base_score: Mapped[float] = mapped_column(Float)
    band: Mapped[str] = mapped_column(String(10))
    thesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="proposed", index=True)
    engine_version: Mapped[str] = mapped_column(String(40))

    # Debate layer outputs
    debate_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    investment_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    conviction_adjustment: Mapped[float | None] = mapped_column(Float, nullable=True)

    agent_scores: Mapped[list["AgentScore"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )
    conviction_breakdown: Mapped[list["ConvictionBreakdown"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )
    policy_evaluations: Mapped[list["PolicyEvaluation"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )
    trade_guard_results: Mapped[list["TradeGuardResult"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )


class AgentScore(UUIDMixin, Base):
    __tablename__ = "agent_scores"

    recommendation_id: Mapped[UUID] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), index=True
    )
    agent: Mapped[str] = mapped_column(String(60), index=True)
    score: Mapped[float] = mapped_column(Float)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    report: Mapped[str | None] = mapped_column(Text, nullable=True)  # full markdown report


class ConvictionBreakdown(UUIDMixin, Base):
    __tablename__ = "conviction_breakdown"

    recommendation_id: Mapped[UUID] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), index=True
    )
    component: Mapped[str] = mapped_column(String(60))
    score: Mapped[float] = mapped_column(Float)
    weight: Mapped[float] = mapped_column(Float)
    contribution: Mapped[float] = mapped_column(Float)


class PolicyEvaluation(UUIDMixin, Base):
    __tablename__ = "policy_evaluations"

    recommendation_id: Mapped[UUID] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), index=True
    )
    rule: Mapped[str] = mapped_column(String(60))
    passed: Mapped[bool] = mapped_column(Boolean)
    detail: Mapped[str] = mapped_column(Text)


class TradeGuardResult(UUIDMixin, Base):
    __tablename__ = "trade_guard_results"

    recommendation_id: Mapped[UUID] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), index=True
    )
    check_name: Mapped[str] = mapped_column(String(60))
    passed: Mapped[bool] = mapped_column(Boolean)
    detail: Mapped[str] = mapped_column(Text)
