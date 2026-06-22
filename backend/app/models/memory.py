"""Semantic memory ORM model (pgvector-backed).

Stores embeddings of recommendations, theses, news events and reflections for
similarity recall. The embedding dimension matches the configured Azure
embedding model (default 1536 = text-embedding-3-small).
"""

from __future__ import annotations

from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

EMBEDDING_DIM = 1536


class MemoryEmbedding(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "memory_embeddings"

    kind: Mapped[str] = mapped_column(String(40), index=True)
    ref_id: Mapped[UUID | None] = mapped_column(nullable=True)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM))
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
