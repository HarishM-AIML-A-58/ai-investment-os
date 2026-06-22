"""Async HTTP client for the openalgo broker gateway.

Wraps the internal gateway contract with timeouts, bounded retries (transient
failures only), and a circuit breaker. Client (4xx) errors are not retried and
do not trip the breaker — they indicate a bad request, not an unhealthy gateway.
"""

from __future__ import annotations

import asyncio
import logging

import httpx

from app.core.config import get_settings
from app.gateway.breaker import CircuitBreaker
from app.gateway.errors import GatewayError, GatewayTimeout, GatewayUnavailable
from app.gateway.models import Candle, Funds, OrderPreview, OrderRequest, OrderResult

logger = logging.getLogger(__name__)


class _TransientStatus(Exception):
    """Internal marker for a retryable 5xx response."""

    def __init__(self, status_code: int) -> None:
        super().__init__(f"gateway {status_code}")
        self.status_code = status_code


class GatewayClient:
    def __init__(
        self,
        base_url: str | None = None,
        client: httpx.AsyncClient | None = None,
        timeout: float = 10.0,
        max_retries: int = 2,
        backoff: float = 0.2,
        breaker: CircuitBreaker | None = None,
    ) -> None:
        self._base_url = base_url or get_settings().gateway_url
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(base_url=self._base_url)
        self._timeout = timeout
        self._max_retries = max_retries
        self._backoff = backoff
        self._breaker = breaker or CircuitBreaker()

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict | None = None,
        params: dict | None = None,
    ) -> httpx.Response:
        if self._breaker.is_open:
            raise GatewayUnavailable("gateway circuit breaker is open")

        attempt = 0
        while True:
            try:
                resp = await self._client.request(
                    method, path, json=json, params=params, timeout=self._timeout
                )
                if resp.status_code >= 500:
                    raise _TransientStatus(resp.status_code)
                if resp.status_code >= 400:
                    # Client error: do not retry, do not trip the breaker.
                    raise GatewayError(
                        f"gateway {resp.status_code}: {resp.text}"
                    )
                self._breaker.record_success()
                return resp
            except (httpx.TimeoutException, httpx.TransportError, _TransientStatus) as exc:
                if attempt < self._max_retries:
                    attempt += 1
                    if self._backoff:
                        await asyncio.sleep(self._backoff * attempt)
                    continue
                self._breaker.record_failure()
                logger.warning("gateway call failed (%s %s): %s", method, path, exc)
                if isinstance(exc, httpx.TimeoutException):
                    raise GatewayTimeout(str(exc)) from exc
                raise GatewayError(str(exc)) from exc

    async def get_funds(self) -> Funds:
        resp = await self._request("GET", "/funds")
        return Funds.model_validate(resp.json())

    async def get_history(
        self,
        symbol: str,
        exchange: str = "NSE",
        interval: str = "day",
        days: int = 400,
    ) -> list[Candle]:
        """Historical OHLCV candles from the broker gateway (Groww)."""
        resp = await self._request(
            "GET",
            "/history",
            params={
                "symbol": symbol,
                "exchange": exchange,
                "interval": interval,
                "days": days,
            },
        )
        data = resp.json()
        rows = data.get("candles", data) if isinstance(data, dict) else data
        return [Candle.model_validate(row) for row in rows]

    async def preview_order(self, order: OrderRequest) -> OrderPreview:
        resp = await self._request(
            "POST", "/order/preview", json=order.model_dump(mode="json")
        )
        return OrderPreview.model_validate(resp.json())

    async def place_order(self, order: OrderRequest) -> OrderResult:
        resp = await self._request(
            "POST", "/order/place", json=order.model_dump(mode="json")
        )
        return OrderResult.model_validate(resp.json())

    async def cancel_order(self, order_id: str) -> OrderResult:
        resp = await self._request(
            "POST", "/order/cancel", json={"order_id": order_id}
        )
        return OrderResult.model_validate(resp.json())
