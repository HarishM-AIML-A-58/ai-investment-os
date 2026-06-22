from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order


async def get_by_idempotency_key(
    session: AsyncSession, idempotency_key: str
) -> Order | None:
    stmt = select(Order).where(Order.idempotency_key == idempotency_key)
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_order(
    session: AsyncSession,
    *,
    recommendation_id: UUID | None,
    idempotency_key: str,
    symbol: str,
    exchange: str,
    side: str,
    quantity: int,
    order_type: str,
    broker_order_id: str | None,
    status: str,
    price: Decimal | None = None,
    stop_loss: Decimal | None = None,
    take_profit: Decimal | None = None,
    trailing_stop_loss_pct: float | None = None,
    trailing_stop_loss_trigger: Decimal | None = None,
    parent_order_id: UUID | None = None,
) -> Order:
    order = Order(
        recommendation_id=recommendation_id,
        idempotency_key=idempotency_key,
        symbol=symbol,
        exchange=exchange,
        side=side,
        quantity=quantity,
        order_type=order_type,
        broker_order_id=broker_order_id,
        status=status,
        price=price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        trailing_stop_loss_pct=trailing_stop_loss_pct,
        trailing_stop_loss_trigger=trailing_stop_loss_trigger,
        parent_order_id=parent_order_id,
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)
    return order

