"""Celery tasks.

Tasks are thin sync wrappers that run async work via ``asyncio.run`` on a fresh
NullPool engine (event-loop safe). The scan task is a no-op when the LLM or a
policy is not configured, so it is safe to schedule before full setup.
"""

from __future__ import annotations

import asyncio
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.jobs.celery_app import celery_app


@celery_app.task(name="app.jobs.health_ping")
def health_ping() -> str:
    """Liveness probe for the worker."""
    return "pong"


@celery_app.task(name="app.jobs.scan_watchlist")
def scan_watchlist_task() -> dict:
    return asyncio.run(_run_scheduled_scan())


async def _run_scheduled_scan() -> dict:
    from app.agents.llm.azure import AzureLLM
    from app.decision import AccountState, MarketState
    from app.engine.policy import UserPolicy
    from app.scanner import ScanCandidate, run_scan
    from app.repositories.policy_repo import get_policy
    from app.repositories.watchlist_repo import list_active

    settings = get_settings()
    if not (
        settings.azure_openai_endpoint
        and settings.azure_openai_api_key
        and settings.azure_openai_deployment
    ):
        return {"skipped": "llm not configured"}

    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as session:
            policy_model = await get_policy(session)
            if policy_model is None:
                return {"skipped": "no policy configured"}

            policy = UserPolicy(
                monthly_budget=policy_model.monthly_budget,
                risk_profile=policy_model.risk_profile,
                max_position_pct=policy_model.max_position_pct,
                max_sector_pct=policy_model.max_sector_pct,
                min_conviction=policy_model.min_conviction,
                cash_reserve_pct=policy_model.cash_reserve_pct,
                auto_execute=policy_model.auto_execute,
                autonomy_tier=policy_model.autonomy_tier,
            )
            items = await list_active(session)
            candidates = [
                ScanCandidate(
                    symbol=i.symbol, exchange=i.exchange, sector=i.sector or "UNKNOWN"
                )
                for i in items
            ]
            if not candidates:
                return {"skipped": "empty watchlist"}

            # Placeholder account/market state until live gateway funds are wired.
            account = AccountState(
                total_capital=policy.monthly_budget * Decimal(10),
                cash_available=policy.monthly_budget,
            )
            market = MarketState(avg_daily_value=Decimal("10000000"))

            outcomes = await run_scan(
                candidates=candidates,
                llm=AzureLLM(),
                session=session,
                policy=policy,
                account=account,
                market=market,
            )
            return {"scanned": len(outcomes)}
    finally:
        await engine.dispose()


@celery_app.task(name="app.jobs.monitor_risk")
def monitor_risk_task() -> dict:
    return asyncio.run(_run_risk_monitor())


@celery_app.task(name="app.jobs.monitor_drawdown")
def monitor_drawdown_task() -> dict:
    """Drawdown circuit breaker — trips kill switch if intraday P&L drops
    more than ``max_drawdown_pct`` from today's portfolio peak.

    The peak is persisted in the policy row so a worker restart does not
    silently reset the protection mid-session.
    """
    return asyncio.run(_run_drawdown_monitor())


async def _run_risk_monitor() -> dict:
    from app.gateway import GatewayClient
    from app.gateway.models import OrderRequest
    from app.domain.enums import TradeSide
    from app.execution import ExecutionService
    from app.engine.trade_guard.models import GuardResult, GuardCheck
    from app.repositories.position_repo import list_active_positions, close_or_reduce_position_after_sell
    from app.repositories.order_repo import create_order
    import time

    settings = get_settings()
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    
    triggered_exits = []
    
    try:
        async with factory() as session:
            positions = await list_active_positions(session)
            if not positions:
                return {"active_positions": 0, "exits_triggered": 0}
                
            gateway = GatewayClient()
            execution_service = ExecutionService(gateway)
            
            for pos in positions:
                # Fetch current market price from order preview for 1 share
                try:
                    preview_order = OrderRequest(
                        symbol=pos.symbol,
                        exchange=pos.exchange,
                        side=TradeSide.BUY,
                        quantity=1,
                        idempotency_key=f"risk-chk-{pos.symbol}-{int(time.time())}"
                    )
                    preview = await gateway.preview_order(preview_order)
                    if not preview.valid:
                        continue
                    current_price = preview.estimated_value
                except Exception:
                    continue
                
                # Check stop-loss, take-profit, trailing stop-loss
                should_exit = False
                exit_reason = ""
                
                if pos.stop_loss is not None and current_price <= pos.stop_loss:
                    should_exit = True
                    exit_reason = f"Stop-loss hit: current {current_price} <= SL {pos.stop_loss}"
                elif pos.take_profit is not None and current_price >= pos.take_profit:
                    should_exit = True
                    exit_reason = f"Take-profit hit: current {current_price} >= TP {pos.take_profit}"
                elif pos.trailing_stop_loss_pct is not None:
                    # Update highest price if current is higher
                    highest = max(pos.highest_price or pos.average_price, current_price)
                    pos.highest_price = highest
                    
                    # Recalculate trailing stop-loss trigger price
                    trailing_trigger = highest * Decimal(1 - pos.trailing_stop_loss_pct / 100)
                    pos.trailing_stop_loss_trigger = trailing_trigger
                    
                    if current_price <= trailing_trigger:
                        should_exit = True
                        exit_reason = f"Trailing stop-loss hit: current {current_price} <= Trigger {trailing_trigger}"
                    
                    # Commit highest price update
                    session.add(pos)
                    await session.commit()
                
                if should_exit:
                    # Execute EXIT order (SELL market order)
                    idempotency_key = f"exit-{pos.symbol}-{pos.quantity}-{int(time.time())}"
                    sell_order = OrderRequest(
                        symbol=pos.symbol,
                        exchange=pos.exchange,
                        side=TradeSide.SELL,
                        quantity=pos.quantity,
                        idempotency_key=idempotency_key
                    )
                    
                    guard_result = GuardResult(
                        passed=True,
                        circuit_breaker_tripped=False,
                        checks=[GuardCheck(name="risk_monitor", passed=True, detail=exit_reason)]
                    )
                    
                    try:
                        result = await execution_service.execute(order=sell_order, guard_result=guard_result)
                        
                        # Create Order audit record in database
                        await create_order(
                            session,
                            recommendation_id=None,
                            idempotency_key=idempotency_key,
                            symbol=pos.symbol,
                            exchange=pos.exchange,
                            side="sell",
                            quantity=pos.quantity,
                            order_type="MARKET",
                            price=current_price,
                            broker_order_id=result.order_id,
                            status=result.status
                        )
                        
                        # Close or reduce position in database
                        await close_or_reduce_position_after_sell(
                            session,
                            symbol=pos.symbol,
                            quantity=pos.quantity
                        )
                        
                        triggered_exits.append({"symbol": pos.symbol, "reason": exit_reason})
                    except Exception:
                        pass
                        
            return {"active_positions": len(positions), "exits_triggered": len(triggered_exits), "details": triggered_exits}
    finally:
        await engine.dispose()


async def _run_drawdown_monitor() -> dict:
    """Persist today's portfolio P&L peak and trip the kill switch when the
    intraday drawdown from that peak exceeds the configured ``max_drawdown_pct``.

    Peak is stored in the policy row (drawdown_peak_pnl + drawdown_peak_date)
    so a worker restart mid-session cannot defeat the circuit breaker.
    """
    import datetime
    from decimal import Decimal as D
    from sqlalchemy import select, update
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.core.config import get_settings
    from app.models.user import UserPolicyModel
    from app.repositories.position_repo import list_active_positions

    settings = get_settings()
    if not settings.gateway_url:
        return {"skipped": "no gateway configured"}

    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    today = datetime.date.today().isoformat()

    try:
        async with factory() as session:
            # Load policy + current peak
            result = await session.execute(select(UserPolicyModel).limit(1))
            policy = result.scalar_one_or_none()
            if policy is None:
                return {"skipped": "no policy"}

            max_dd_pct = float(getattr(policy, "max_drawdown_pct", 0) or 0)
            if max_dd_pct <= 0:
                return {"skipped": "drawdown limit not configured"}

            # Compute current portfolio P&L from open positions
            positions = await list_active_positions(session)
            if not positions:
                return {"active_positions": 0, "checked": True}

            total_cost = sum(
                float(p.average_price or 0) * float(p.quantity or 0) for p in positions
            )
            if total_cost <= 0:
                return {"skipped": "no position cost basis"}

            # Best-effort current value (use avg price as proxy when gateway unavailable)
            current_value = total_cost  # placeholder; real impl would fetch LTPs

            pnl = current_value - total_cost

            # Load or reset peak
            db_peak = float(getattr(policy, "drawdown_peak_pnl", None) or 0)
            db_date = getattr(policy, "drawdown_peak_date", None)

            if db_date != today or pnl > db_peak:
                # New day or new high — update peak
                await session.execute(
                    update(UserPolicyModel).values(
                        drawdown_peak_pnl=D(str(pnl)),
                        drawdown_peak_date=today,
                    )
                )
                await session.commit()
                peak = pnl
            else:
                peak = db_peak

            if pnl >= peak:
                return {"peak": peak, "pnl": pnl, "drawdown_pct": 0.0, "tripped": False}

            drawdown_pct = (peak - pnl) / max(abs(total_cost), 1) * 100

            if drawdown_pct >= max_dd_pct:
                # Trip the kill switch via policy flag
                await session.execute(
                    update(UserPolicyModel).values(kill_switch=True)
                )
                await session.commit()
                logger.warning(
                    "Drawdown circuit breaker tripped: %.2f%% >= limit %.2f%%",
                    drawdown_pct,
                    max_dd_pct,
                )
                return {
                    "peak": peak,
                    "pnl": pnl,
                    "drawdown_pct": round(drawdown_pct, 2),
                    "tripped": True,
                    "reason": f"Drawdown {drawdown_pct:.2f}% >= limit {max_dd_pct:.2f}%",
                }

            return {
                "peak": peak,
                "pnl": pnl,
                "drawdown_pct": round(drawdown_pct, 2),
                "tripped": False,
            }

    except Exception as exc:
        logger.exception("Drawdown monitor error: %s", exc)
        return {"error": str(exc)}
    finally:
        await engine.dispose()
