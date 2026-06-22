"""Execution Service — the ONLY module permitted to place orders.

Hard invariants:
  1. An order is placed ONLY if the supplied :class:`GuardResult` passed. This is
     the structural enforcement of "AI proposes, deterministic code disposes":
     no caller can reach the gateway's place_order without a passing guard.
  2. Placement is idempotent by ``idempotency_key`` — a repeated request returns
     the original result instead of double-placing.
  3. The gateway preview must validate the order before placement.

Note: agents/the LangGraph fabric must NOT import this module — execution is
reachable only through the deterministic Conviction → Policy → Trade Guard path.
"""

from __future__ import annotations

import logging

from app.execution.errors import (
    ExecutionRejectedError,
    GuardNotPassedError,
)
from app.execution.protocols import BrokerGateway
from app.gateway.models import OrderRequest, OrderResult
from app.engine.trade_guard.models import GuardResult

logger = logging.getLogger(__name__)


class ExecutionService:
    def __init__(self, gateway: BrokerGateway) -> None:
        self._gateway = gateway
        # In-memory idempotency ledger. Backed by the orders table in a later
        # milestone; the contract (no double placement) is enforced here.
        self._placed: dict[str, OrderResult] = {}

    async def execute(
        self, *, order: OrderRequest, guard_result: GuardResult
    ) -> OrderResult:
        # (1) Hard gate — refuse anything the Trade Guard did not approve.
        if not guard_result.passed:
            raise GuardNotPassedError(
                f"trade guard did not pass: {guard_result.failed_checks}"
            )

        # (2) Idempotency — never place the same order twice.
        existing = self._placed.get(order.idempotency_key)
        if existing is not None:
            logger.info(
                "idempotent replay for key=%s -> order_id=%s",
                order.idempotency_key,
                existing.order_id,
            )
            return existing

        # (3) Preview/validate before placement.
        preview = await self._gateway.preview_order(order)
        if not preview.valid:
            raise ExecutionRejectedError(
                f"gateway rejected order: {preview.message}"
            )

        # (4) Place and record for idempotency.
        result = await self._gateway.place_order(order)
        self._placed[order.idempotency_key] = result
        logger.info(
            "order placed key=%s symbol=%s order_id=%s",
            order.idempotency_key,
            order.symbol,
            result.order_id,
        )
        return result
