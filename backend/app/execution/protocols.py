"""Structural interface the Execution Service depends on.

Using a Protocol keeps the service decoupled from the concrete GatewayClient and
makes it trivially testable with a fake gateway.
"""

from __future__ import annotations

from typing import Protocol

from app.gateway.models import OrderPreview, OrderRequest, OrderResult


class BrokerGateway(Protocol):
    async def preview_order(self, order: OrderRequest) -> OrderPreview: ...

    async def place_order(self, order: OrderRequest) -> OrderResult: ...
