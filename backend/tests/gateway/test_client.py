"""GatewayClient tests using httpx MockTransport (no real network)."""

from __future__ import annotations

from collections.abc import Callable

import httpx
import pytest

from app.domain.enums import TradeSide
from app.gateway import (
    CircuitBreaker,
    Funds,
    GatewayClient,
    GatewayError,
    GatewayUnavailable,
    OrderRequest,
)

FUNDS_JSON = {"available_cash": "10000.00", "collateral": "0", "utilized": "0"}
PLACE_JSON = {
    "order_id": "OID1",
    "status": "open",
    "message": "placed",
    "filled_quantity": 0,
}
PREVIEW_JSON = {
    "valid": True,
    "estimated_value": "1000.00",
    "margin_required": "1000.00",
    "message": "ok",
}


def _client(handler: Callable[[httpx.Request], httpx.Response]) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url="http://gateway:5000", transport=httpx.MockTransport(handler)
    )


def _order() -> OrderRequest:
    return OrderRequest(
        symbol="TCS", exchange="NSE", side=TradeSide.BUY, quantity=10,
        idempotency_key="k1",
    )


async def test_get_funds_parsed() -> None:
    gw = GatewayClient(client=_client(lambda r: httpx.Response(200, json=FUNDS_JSON)))
    funds = await gw.get_funds()
    assert isinstance(funds, Funds)
    assert str(funds.available_cash) == "10000.00"
    await gw.aclose()


async def test_place_order_parsed() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/order/place"
        return httpx.Response(200, json=PLACE_JSON)

    gw = GatewayClient(client=_client(handler))
    result = await gw.place_order(_order())
    assert result.order_id == "OID1"
    assert result.status == "open"
    await gw.aclose()


async def test_preview_order_parsed() -> None:
    gw = GatewayClient(client=_client(lambda r: httpx.Response(200, json=PREVIEW_JSON)))
    preview = await gw.preview_order(_order())
    assert preview.valid is True
    assert str(preview.margin_required) == "1000.00"
    await gw.aclose()


async def test_retries_then_succeeds_on_transient_5xx() -> None:
    state = {"calls": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        state["calls"] += 1
        if state["calls"] == 1:
            return httpx.Response(503)
        return httpx.Response(200, json=FUNDS_JSON)

    gw = GatewayClient(client=_client(handler), max_retries=1, backoff=0.0)
    funds = await gw.get_funds()
    assert state["calls"] == 2
    assert funds.available_cash is not None
    await gw.aclose()


async def test_client_error_not_retried() -> None:
    state = {"calls": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        state["calls"] += 1
        return httpx.Response(400, text="bad request")

    gw = GatewayClient(client=_client(handler), max_retries=3, backoff=0.0)
    with pytest.raises(GatewayError):
        await gw.get_funds()
    assert state["calls"] == 1  # no retries on 4xx
    await gw.aclose()


async def test_circuit_breaker_opens_after_failures() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    gw = GatewayClient(
        client=_client(handler),
        max_retries=0,
        backoff=0.0,
        breaker=CircuitBreaker(fail_max=2),
    )
    for _ in range(2):
        with pytest.raises(GatewayError):
            await gw.get_funds()
    # Breaker is now open → short-circuit without calling the gateway.
    with pytest.raises(GatewayUnavailable):
        await gw.get_funds()
    await gw.aclose()


async def test_transport_error_raises_gateway_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    gw = GatewayClient(client=_client(handler), max_retries=0, backoff=0.0)
    with pytest.raises(GatewayError):
        await gw.get_funds()
    await gw.aclose()
