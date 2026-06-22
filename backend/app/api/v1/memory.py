"""Semantic memory recall API (pgvector)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.llm.embedder import Embedder
from app.api.deps import get_embedder
from app.db.session import get_db
from app.repositories.memory_repo import search_similar

router = APIRouter(prefix="/memory", tags=["memory"])


class MemoryHit(BaseModel):
    content: str
    kind: str
    ref_id: str | None
    distance: float


@router.get("/search", response_model=list[MemoryHit])
async def search(
    q: str,
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    embedder: Embedder | None = Depends(get_embedder),
) -> list[MemoryHit]:
    if embedder is None:
        raise HTTPException(status_code=503, detail="embeddings not configured")
    vector = await embedder.embed(q)
    results = await search_similar(db, vector, limit=limit)
    return [
        MemoryHit(
            content=row.content,
            kind=row.kind,
            ref_id=str(row.ref_id) if row.ref_id else None,
            distance=distance,
        )
        for row, distance in results
    ]
