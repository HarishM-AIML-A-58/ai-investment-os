"""Typed request/response models for the broker gateway contract.

These describe the *internal* HTTP contract between the FastAPI backend and the
openalgo gateway. The gateway adapter maps them onto openalgo's Groww endpoints.
"""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, Field

from app.domain.enums import TradeSide


class OrderRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    side: TradeSide
    quantity: int = Field(gt=0)
    product: str = "CNC"  # delivery (cash-and-carry) for V1
    order_type: str = "MARKET"
    price: Decimal | None = None  # required for LIMIT orders
    idempotency_key: str = Field(min_length=1)


class OrderPreview(BaseModel):
    valid: bool
    estimated_value: Decimal
    margin_required: Decimal
    message: str = ""


class OrderResult(BaseModel):
    order_id: str
    status: str
    message: str = ""
    filled_quantity: int = 0


class Funds(BaseModel):
    available_cash: Decimal
    collateral: Decimal = Decimal("0")
    utilized: Decimal = Decimal("0")


class Candle(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
