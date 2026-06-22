"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 1536
_now = sa.text("now()")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
    )

    op.create_table(
        "user_policies",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("monthly_budget", sa.Numeric(18, 2), nullable=False),
        sa.Column("risk_profile", sa.String(20), nullable=False, server_default="moderate"),
        sa.Column("max_position_pct", sa.Float(), nullable=False, server_default="20.0"),
        sa.Column("max_sector_pct", sa.Float(), nullable=False, server_default="30.0"),
        sa.Column("min_conviction", sa.Float(), nullable=False, server_default="80.0"),
        sa.Column("cash_reserve_pct", sa.Float(), nullable=False, server_default="20.0"),
        sa.Column("auto_execute", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("autonomy_tier", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
    )

    op.create_table(
        "securities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("symbol", sa.String(40), nullable=False),
        sa.Column("exchange", sa.String(20), nullable=False),
        sa.Column("sector", sa.String(80), nullable=True),
        sa.Column("name", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
        sa.UniqueConstraint("symbol", "exchange", name="uq_securities_symbol"),
    )
    op.create_index("ix_securities_symbol", "securities", ["symbol"])

    op.create_table(
        "recommendations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "security_id",
            sa.Uuid(),
            sa.ForeignKey("securities.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("action", sa.String(10), nullable=False),
        sa.Column("conviction", sa.Float(), nullable=False),
        sa.Column("base_score", sa.Float(), nullable=False),
        sa.Column("band", sa.String(10), nullable=False),
        sa.Column("thesis", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="proposed"),
        sa.Column("engine_version", sa.String(40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
    )
    op.create_index("ix_recommendations_security_id", "recommendations", ["security_id"])
    op.create_index("ix_recommendations_conviction", "recommendations", ["conviction"])
    op.create_index("ix_recommendations_status", "recommendations", ["status"])

    op.create_table(
        "agent_scores",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "recommendation_id",
            sa.Uuid(),
            sa.ForeignKey("recommendations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("agent", sa.String(60), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("rationale", sa.Text(), nullable=True),
    )
    op.create_index("ix_agent_scores_recommendation_id", "agent_scores", ["recommendation_id"])
    op.create_index("ix_agent_scores_agent", "agent_scores", ["agent"])

    op.create_table(
        "conviction_breakdown",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "recommendation_id",
            sa.Uuid(),
            sa.ForeignKey("recommendations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("component", sa.String(60), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("contribution", sa.Float(), nullable=False),
    )
    op.create_index(
        "ix_conviction_breakdown_recommendation_id",
        "conviction_breakdown",
        ["recommendation_id"],
    )

    op.create_table(
        "policy_evaluations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "recommendation_id",
            sa.Uuid(),
            sa.ForeignKey("recommendations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rule", sa.String(60), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_policy_evaluations_recommendation_id",
        "policy_evaluations",
        ["recommendation_id"],
    )

    op.create_table(
        "trade_guard_results",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "recommendation_id",
            sa.Uuid(),
            sa.ForeignKey("recommendations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("check_name", sa.String(60), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_trade_guard_results_recommendation_id",
        "trade_guard_results",
        ["recommendation_id"],
    )

    op.create_table(
        "memory_embeddings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("ref_id", sa.Uuid(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=False),
        sa.Column("meta", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_now),
    )
    op.create_index("ix_memory_embeddings_kind", "memory_embeddings", ["kind"])
    op.execute(
        "CREATE INDEX ix_memory_embeddings_embedding ON memory_embeddings "
        "USING hnsw (embedding vector_l2_ops)"
    )


def downgrade() -> None:
    op.drop_table("memory_embeddings")
    op.drop_table("trade_guard_results")
    op.drop_table("policy_evaluations")
    op.drop_table("conviction_breakdown")
    op.drop_table("agent_scores")
    op.drop_table("recommendations")
    op.drop_table("securities")
    op.drop_table("user_policies")
    op.drop_table("users")
