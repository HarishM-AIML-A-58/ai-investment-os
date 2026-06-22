"""orders, outcomes, watchlist, reports

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_now = sa.text("now()")


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "recommendation_id",
            sa.Uuid(),
            sa.ForeignKey("recommendations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("idempotency_key", sa.String(80), nullable=False, unique=True),
        sa.Column("symbol", sa.String(40), nullable=False),
        sa.Column("exchange", sa.String(20), nullable=False),
        sa.Column("side", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("order_type", sa.String(20), nullable=False, server_default="MARKET"),
        sa.Column("broker_order_id", sa.String(80), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
    )
    op.create_index("ix_orders_recommendation_id", "orders", ["recommendation_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    op.create_table(
        "recommendation_outcomes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "recommendation_id",
            sa.Uuid(),
            sa.ForeignKey("recommendations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("horizon", sa.String(20), nullable=False),
        sa.Column("return_pct", sa.Float(), nullable=False),
        sa.Column("nifty_return_pct", sa.Float(), nullable=False),
        sa.Column("alpha", sa.Float(), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
    )
    op.create_index(
        "ix_recommendation_outcomes_recommendation_id",
        "recommendation_outcomes",
        ["recommendation_id"],
    )
    op.create_index(
        "ix_recommendation_outcomes_alpha", "recommendation_outcomes", ["alpha"]
    )

    op.create_table(
        "watchlist",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("symbol", sa.String(40), nullable=False),
        sa.Column("exchange", sa.String(20), nullable=False, server_default="NSE"),
        sa.Column("sector", sa.String(80), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
        sa.UniqueConstraint("symbol", "exchange", name="uq_watchlist_symbol"),
    )
    op.create_index("ix_watchlist_symbol", "watchlist", ["symbol"])

    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column("report_type", sa.String(20), nullable=False),
        sa.Column("payload", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
        sa.UniqueConstraint("report_date", "report_type", name="uq_reports_report_date"),
    )
    op.create_index("ix_reports_report_date", "reports", ["report_date"])


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("watchlist")
    op.drop_table("recommendation_outcomes")
    op.drop_table("orders")
