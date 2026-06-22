"""Persistence helpers for the securities master."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security import Security


async def get_security_by_symbol(
    session: AsyncSession,
    symbol: str,
    exchange: str = "NSE",
) -> Security | None:
    """Return a Security by symbol (and optionally exchange), or None."""
    stmt = select(Security).where(Security.symbol == symbol.upper())
    if exchange:
        stmt = stmt.where(Security.exchange == exchange)
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_or_create_security(
    session: AsyncSession,
    *,
    symbol: str,
    exchange: str,
    sector: str | None = None,
    name: str | None = None,
) -> Security:
    stmt = select(Security).where(
        Security.symbol == symbol, Security.exchange == exchange
    )
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        return existing
    security = Security(symbol=symbol, exchange=exchange, sector=sector, name=name)
    session.add(security)
    await session.flush()
    return security
