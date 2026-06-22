"""Execution Service tests — the core money-authority invariant.

A fake gateway counts preview/place calls so we can prove the service never
reaches the broker without a passing Trade Guard result.
"""

from __future__ import annotations

from decimal import Decimal

import pytest

from app.domain.enums import TradeSide
from app.engine.trade_guard.models import GuardCheck, GuardResult
from app.execution import (
    ExecutionRejectedError,
    ExecutionService,
    GuardNotPassedError,
)
from app.gateway.models import OrderPreview, OrderRequest, OrderResult


class FakeGateway:
    def __init__(self, preview_valid: bool = True, preview_message: str = "ok") -> None:
        self.preview_calls = 0
        self.place_calls = 0
        self._preview_valid = preview_valid
        self._preview_message = preview_message

    async def preview_order(self, order: OrderRequest) -> OrderPreview:
        self.preview_calls += 1
        return OrderPreview(
            valid=self._preview_valid,
            estimated_value=Decimal("1000"),
            margin_required=Decimal("1000"),
            message=self._preview_message,
        )

    async def place_order(self, order: OrderRequest) -> OrderResult:
        self.place_calls += 1
        return OrderResult(
            order_id=f"OID{self.place_calls}", status="open", message="placed"
        )


def _passing_guard() -> GuardResult:
    return GuardResult(
        passed=True,
        circuit_breaker_tripped=False,
        checks=[GuardCheck(name="policy", passed=True, detail="ALLOW")],
    )


def _failing_guard() -> GuardResult:
    return GuardResult(
        passed=False,
        circuit_breaker_tripped=False,
        checks=[GuardCheck(name="risk", passed=False, detail="risk too low")],
    )


def _order(key: str = "idem-1") -> OrderRequest:
    return OrderRequest(
        symbol="TCS", exchange="NSE", side=TradeSide.BUY, quantity=10,
        idempotency_key=key,
    )


async def test_refuses_when_guard_not_passed() -> None:
    gw = FakeGateway()
    svc = ExecutionService(gw)
    with pytest.raises(GuardNotPassedError):
        await svc.execute(order=_order(), guard_result=_failing_guard())
    # Critical: the gateway was never touched.
    assert gw.preview_calls == 0
    assert gw.place_calls == 0


async def test_executes_when_guard_passes() -> None:
    gw = FakeGateway()
    svc = ExecutionService(gw)
    result = await svc.execute(order=_order(), guard_result=_passing_guard())
    assert result.order_id == "OID1"
    assert gw.preview_calls == 1
    assert gw.place_calls == 1


async def test_idempotent_replay_does_not_double_place() -> None:
    gw = FakeGateway()
    svc = ExecutionService(gw)
    first = await svc.execute(order=_order("dup"), guard_result=_passing_guard())
    second = await svc.execute(order=_order("dup"), guard_result=_passing_guard())
    assert first.order_id == second.order_id
    assert gw.place_calls == 1  # placed exactly once
    assert gw.preview_calls == 1


async def test_rejected_preview_blocks_placement() -> None:
    gw = FakeGateway(preview_valid=False, preview_message="insufficient margin")
    svc = ExecutionService(gw)
    with pytest.raises(ExecutionRejectedError):
        await svc.execute(order=_order(), guard_result=_passing_guard())
    assert gw.place_calls == 0
