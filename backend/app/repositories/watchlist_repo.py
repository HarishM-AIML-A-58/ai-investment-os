"""Watchlist persistence."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.watchlist import WatchlistItem


async def list_active(session: AsyncSession) -> list[WatchlistItem]:
    stmt = select(WatchlistItem).where(WatchlistItem.active.is_(True))
    return list((await session.execute(stmt)).scalars().all())


async def add_item(
    session: AsyncSession, *, symbol: str, exchange: str = "NSE", sector: str | None = None
) -> WatchlistItem:
    item = WatchlistItem(symbol=symbol, exchange=exchange, sector=sector, active=True)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


async def remove_item(session: AsyncSession, item_id: str) -> bool:
    """Soft-delete a watchlist item. Returns True if found and deactivated."""
    from uuid import UUID
    try:
        uid = UUID(item_id)
    except ValueError:
        return False
    stmt = select(WatchlistItem).where(WatchlistItem.id == uid)
    result = await session.execute(stmt)
    item = result.scalar_one_or_none()
    if item is None:
        return False
    item.active = False
    await session.commit()
    return True
