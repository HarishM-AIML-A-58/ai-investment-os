"""Watchlist API — the universe the scanner sweeps."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.watchlist_repo import add_item, list_active, remove_item

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class WatchlistItemBody(BaseModel):
    symbol: str
    exchange: str = "NSE"
    sector: str | None = None


class WatchlistItemOut(BaseModel):
    id: UUID
    symbol: str
    exchange: str
    sector: str | None
    active: bool


@router.get("", response_model=list[WatchlistItemOut])
async def list_watchlist(db: AsyncSession = Depends(get_db)) -> list[WatchlistItemOut]:
    items = await list_active(db)
    return [
        WatchlistItemOut(
            id=i.id, symbol=i.symbol, exchange=i.exchange, sector=i.sector, active=i.active
        )
        for i in items
    ]


@router.post("", response_model=WatchlistItemOut)
async def add_watchlist(
    body: WatchlistItemBody, db: AsyncSession = Depends(get_db)
) -> WatchlistItemOut:
    item = await add_item(db, symbol=body.symbol, exchange=body.exchange, sector=body.sector)
    return WatchlistItemOut(
        id=item.id, symbol=item.symbol, exchange=item.exchange, sector=item.sector, active=item.active
    )


@router.delete("/{item_id}", status_code=204)
async def delete_watchlist(item_id: str, db: AsyncSession = Depends(get_db)) -> None:
    removed = await remove_item(db, item_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
