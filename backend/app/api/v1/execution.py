"""Human-approved execution API.

A recommendation can only be executed if it PASSED the Trade Guard
(``status == "guard_passed"``). The stored guard checks are reconstructed into a
GuardResult and handed to the ExecutionService — which still independently
refuses anything that did not pass. Execution is idempotent per recommendation.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_gateway
from app.db.session import get_db
from app.domain.enums import TradeSide
from app.engine.trade_guard.models import GuardCheck, GuardResult
from app.execution import ExecutionError, ExecutionService
from app.gateway import GatewayClient
from app.gateway.models import OrderRequest
from app.models.order import Order
from app.models.security import Security
from app.repositories.order_repo import create_order, get_by_idempotency_key
from app.repositories.recommendation_repo import get_recommendation

router = APIRouter(prefix="/recommendations", tags=["execution"])


class ExecuteRequest(BaseModel):
    quantity: int = Field(gt=0)
    order_type: str = "MARKET"
    price: Decimal | None = None
    stop_loss: Decimal | None = None
    take_profit: Decimal | None = None
    trailing_stop_loss_pct: float | None = None


class OrderOut(BaseModel):
    id: UUID
    recommendation_id: UUID | None
    symbol: str
    exchange: str
    side: str
    quantity: int
    order_type: str
    price: Decimal | None
    stop_loss: Decimal | None
    take_profit: Decimal | None
    trailing_stop_loss_pct: float | None
    broker_order_id: str | None
    status: str
    idempotency_key: str


def _to_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        recommendation_id=order.recommendation_id,
        symbol=order.symbol,
        exchange=order.exchange,
        side=order.side,
        quantity=order.quantity,
        order_type=order.order_type,
        price=order.price,
        stop_loss=order.stop_loss,
        take_profit=order.take_profit,
        trailing_stop_loss_pct=order.trailing_stop_loss_pct,
        broker_order_id=order.broker_order_id,
        status=order.status,
        idempotency_key=order.idempotency_key,
    )


@router.post("/{recommendation_id}/execute", response_model=OrderOut)
async def execute_recommendation(
    recommendation_id: UUID,
    body: ExecuteRequest,
    db: AsyncSession = Depends(get_db),
    gateway: GatewayClient = Depends(get_gateway),
) -> OrderOut:
    rec = await get_recommendation(db, recommendation_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="recommendation not found")

    # Idempotency first: a replay returns the original order regardless of the
    # recommendation's now-"executed" status.
    idempotency_key = f"rec-{recommendation_id}"
    existing = await get_by_idempotency_key(db, idempotency_key)
    if existing is not None:
        return _to_out(existing)

    if rec.status != "guard_passed":
        raise HTTPException(
            status_code=409,
            detail=f"recommendation status is '{rec.status}', not guard_passed",
        )
    if rec.action != "buy":
        raise HTTPException(
            status_code=409, detail="only BUY recommendations are executable in v1"
        )

    security = await db.get(Security, rec.security_id)
    if security is None:
        raise HTTPException(status_code=409, detail="security not found")

    guard_result = GuardResult(
        passed=True,  # status guaranteed guard_passed above
        circuit_breaker_tripped=False,
        checks=[
            GuardCheck(name=g.check_name, passed=g.passed, detail=g.detail)
            for g in rec.trade_guard_results
        ],
    )
    order_request = OrderRequest(
        symbol=security.symbol,
        exchange=security.exchange,
        side=TradeSide.BUY,
        quantity=body.quantity,
        order_type=body.order_type,
        price=body.price,
        idempotency_key=idempotency_key,
    )

    # Estimate fill price before executing
    try:
        preview = await gateway.preview_order(order_request)
        if not preview.valid:
            raise HTTPException(status_code=422, detail=f"order preview failed: {preview.message}")
        fill_price = body.price if body.price is not None else (preview.estimated_value / Decimal(body.quantity))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"gateway preview error: {exc}")

    service = ExecutionService(gateway)
    try:
        result = await service.execute(order=order_request, guard_result=guard_result)
    except ExecutionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    rec.status = "executed"
    order = await create_order(
        db,
        recommendation_id=rec.id,
        idempotency_key=idempotency_key,
        symbol=order_request.symbol,
        exchange=order_request.exchange,
        side="buy",
        quantity=body.quantity,
        order_type=body.order_type,
        price=body.price,
        stop_loss=body.stop_loss,
        take_profit=body.take_profit,
        trailing_stop_loss_pct=body.trailing_stop_loss_pct,
        broker_order_id=result.order_id,
        status=result.status,
    )

    # Open/update Position record locally
    from app.repositories.position_repo import upsert_position_after_buy
    await upsert_position_after_buy(
        db,
        symbol=order_request.symbol,
        exchange=order_request.exchange,
        quantity=body.quantity,
        price=fill_price,
        stop_loss=body.stop_loss,
        take_profit=body.take_profit,
        trailing_stop_loss_pct=body.trailing_stop_loss_pct,
    )

    return _to_out(order)
