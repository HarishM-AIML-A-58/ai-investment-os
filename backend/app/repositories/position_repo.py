"""Position persistence and calculation helpers."""

from __future__ import annotations

from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.position import Position


async def get_active_position(session: AsyncSession, symbol: str) -> Position | None:
    stmt = select(Position).where(Position.symbol == symbol, Position.status == "open")
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_active_positions(session: AsyncSession) -> list[Position]:
    stmt = select(Position).where(Position.status == "open")
    return list((await session.execute(stmt)).scalars().all())


async def upsert_position_after_buy(
    session: AsyncSession,
    *,
    symbol: str,
    exchange: str,
    quantity: int,
    price: Decimal,
    stop_loss: Decimal | None = None,
    take_profit: Decimal | None = None,
    trailing_stop_loss_pct: float | None = None,
) -> Position:
    existing = await get_active_position(session, symbol)
    if existing is not None:
        old_qty = existing.quantity
        new_qty = old_qty + quantity
        
        # Calculate new weighted average cost price
        total_cost = (Decimal(old_qty) * existing.average_price) + (Decimal(quantity) * price)
        new_avg = total_cost / Decimal(new_qty)
        
        existing.quantity = new_qty
        existing.average_price = new_avg
        existing.highest_price = max(existing.highest_price or existing.average_price, price)
        
        # Override SL/TP settings if explicitly specified in new execution order
        if stop_loss is not None:
            existing.stop_loss = stop_loss
        if take_profit is not None:
            existing.take_profit = take_profit
        if trailing_stop_loss_pct is not None:
            existing.trailing_stop_loss_pct = trailing_stop_loss_pct
            existing.trailing_stop_loss_trigger = price * Decimal(1 - trailing_stop_loss_pct / 100)

        await session.commit()
        await session.refresh(existing)
        return existing
    else:
        trigger_val = None
        if trailing_stop_loss_pct is not None:
            trigger_val = price * Decimal(1 - trailing_stop_loss_pct / 100)
            
        pos = Position(
            symbol=symbol,
            exchange=exchange,
            quantity=quantity,
            average_price=price,
            highest_price=price,
            stop_loss=stop_loss,
            take_profit=take_profit,
            trailing_stop_loss_pct=trailing_stop_loss_pct,
            trailing_stop_loss_trigger=trigger_val,
            status="open",
        )
        session.add(pos)
        await session.commit()
        await session.refresh(pos)
        return pos


async def close_or_reduce_position_after_sell(
    session: AsyncSession,
    *,
    symbol: str,
    quantity: int,
) -> Position | None:
    existing = await get_active_position(session, symbol)
    if existing is None:
        return None
        
    new_qty = max(0, existing.quantity - quantity)
    existing.quantity = new_qty
    
    if new_qty == 0:
        existing.status = "closed"
        
    await session.commit()
    await session.refresh(existing)
    return existing
