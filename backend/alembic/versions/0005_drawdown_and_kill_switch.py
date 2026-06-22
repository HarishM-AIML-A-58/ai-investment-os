"""Add drawdown circuit breaker fields to user_policies

Revision ID: 0005_drawdown_and_kill_switch
Revises: 0004_debate_and_backtest
Create Date: 2026-06-22

Changes:
- user_policies: add kill_switch, max_drawdown_pct, drawdown_peak_pnl, drawdown_peak_date
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_drawdown_and_kill_switch"
down_revision: Union[str, None] = "0004_debate_and_backtest"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_policies",
        sa.Column("kill_switch", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "user_policies",
        sa.Column("max_drawdown_pct", sa.Float(), nullable=False, server_default="0.0"),
    )
    op.add_column(
        "user_policies",
        sa.Column(
            "drawdown_peak_pnl",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "user_policies",
        sa.Column("drawdown_peak_date", sa.String(10), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_policies", "drawdown_peak_date")
    op.drop_column("user_policies", "drawdown_peak_pnl")
    op.drop_column("user_policies", "max_drawdown_pct")
    op.drop_column("user_policies", "kill_switch")
