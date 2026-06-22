"""Persistence and semantic recall for the memory layer (pgvector)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import MemoryEmbedding


async def add_embedding(
    session: AsyncSession,
    *,
    kind: str,
    content: str,
    embedding: list[float],
    ref_id: UUID | None = None,
    meta: dict | None = None,
) -> MemoryEmbedding:
    row = MemoryEmbedding(
        kind=kind,
        content=content,
        embedding=embedding,
        ref_id=ref_id,
        meta=meta or {},
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def search_similar(
    session: AsyncSession,
    query_embedding: list[float],
    *,
    limit: int = 5,
    kind: str | None = None,
) -> list[tuple[MemoryEmbedding, float]]:
    """Return (row, L2 distance) tuples ordered nearest-first."""
    distance = MemoryEmbedding.embedding.l2_distance(query_embedding)
    stmt = select(MemoryEmbedding, distance.label("distance"))
    if kind is not None:
        stmt = stmt.where(MemoryEmbedding.kind == kind)
    stmt = stmt.order_by(distance).limit(limit)
    rows = (await session.execute(stmt)).all()
    return [(row[0], float(row[1])) for row in rows]
