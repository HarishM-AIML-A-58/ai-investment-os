"""Add debate columns + backtest tables

Revision ID: 0004_debate_and_backtest
Revises: ccba4fdef797
Create Date: 2026-06-22

Changes:
- recommendations: add debate_transcript, investment_plan, conviction_adjustment
- agent_scores: add report column
- NEW: backtest_run table
- NEW: backtest_lesson table
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_debate_and_backtest"
down_revision: Union[str, None] = "ccba4fdef797"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_now = sa.text("now()")


def upgrade() -> None:
    # ── recommendations: add debate layer columns ────────────────────────────
    op.add_column(
        "recommendations",
        sa.Column("debate_transcript", sa.Text(), nullable=True),
    )
    op.add_column(
        "recommendations",
        sa.Column("investment_plan", sa.Text(), nullable=True),
    )
    op.add_column(
        "recommendations",
        sa.Column("conviction_adjustment", sa.Float(), nullable=True),
    )

    # ── agent_scores: add full report column ─────────────────────────────────
    op.add_column(
        "agent_scores",
        sa.Column("report", sa.Text(), nullable=True),
    )

    # ── backtest_run ──────────────────────────────────────────────────────────
    op.create_table(
        "backtest_run",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("backtest_date", sa.Date(), nullable=False),
        sa.Column(
            "recommendation_id",
            sa.Uuid(),
            sa.ForeignKey("recommendations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("signal", sa.String(10), nullable=True),       # BUY | HOLD | AVOID
        sa.Column("conviction", sa.Float(), nullable=True),
        sa.Column("entry_price", sa.Float(), nullable=True),
        sa.Column("exit_price", sa.Float(), nullable=True),
        sa.Column("holding_days", sa.Integer(), default=20),
        sa.Column("raw_return_pct", sa.Float(), nullable=True),
        sa.Column("nifty50_return_pct", sa.Float(), nullable=True),
        sa.Column("alpha_pct", sa.Float(), nullable=True),       # raw - nifty50
        sa.Column("outcome", sa.String(10), nullable=True),      # WIN | LOSS | NEUTRAL
        sa.Column("llm_reflection", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), default="pending"),   # pending|complete|error
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now),
        sa.UniqueConstraint("symbol", "backtest_date", name="uq_backtest_run_symbol_date"),
    )
    op.create_index("ix_backtest_run_symbol", "backtest_run", ["symbol"])
    op.create_index("ix_backtest_run_status", "backtest_run", ["status"])

    # ── backtest_lesson ────────────────────────────────────────────────────────
    op.create_table(
        "backtest_lesson",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("lesson", sa.Text(), nullable=False),
        sa.Column("alpha_pct", sa.Float(), nullable=True),
        sa.Column("backtest_run_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now),
    )
    op.create_index("ix_backtest_lesson_symbol", "backtest_lesson", ["symbol"])


def downgrade() -> None:
    # ── backtest tables ───────────────────────────────────────────────────────
    op.drop_index("ix_backtest_lesson_symbol", "backtest_lesson")
    op.drop_table("backtest_lesson")
    op.drop_index("ix_backtest_run_status", "backtest_run")
    op.drop_index("ix_backtest_run_symbol", "backtest_run")
    op.drop_table("backtest_run")

    # ── agent_scores ──────────────────────────────────────────────────────────
    op.drop_column("agent_scores", "report")

    # ── recommendations ───────────────────────────────────────────────────────
    op.drop_column("recommendations", "conviction_adjustment")
    op.drop_column("recommendations", "investment_plan")
    op.drop_column("recommendations", "debate_transcript")
