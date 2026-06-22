"""Historical NSE/BSE price fetcher.

Uses the OpenAlgo broker gateway (already wired in GatewayClient) to fetch
historical OHLCV data. Falls back gracefully when the exact date is missing
(e.g. weekend, holiday) by returning the nearest available close.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

from app.gateway.client import GatewayClient

logger = logging.getLogger(__name__)

# NIFTY50 symbol as recognised by the OpenAlgo/Groww gateway
_NIFTY50_SYMBOL = "NIFTY"
_NIFTY50_EXCHANGE = "NSE"


async def get_close_price_on_date(
    symbol: str,
    target_date: date,
    exchange: str = "NSE",
    *,
    gateway: GatewayClient | None = None,
    search_window_days: int = 7,
) -> float | None:
    """Return the closing price of *symbol* on or just before *target_date*.

    Fetches a small window of daily candles centred on the target date and
    returns the closest available close. Returns ``None`` if no data found.
    """
    client = gateway or GatewayClient()
    try:
        candles = await client.get_history(
            symbol=symbol,
            exchange=exchange,
            interval="day",
            days=search_window_days + 5,  # buffer for weekends/holidays
        )
    except Exception as exc:
        logger.warning(
            "Failed to fetch history for %s/%s: %s", symbol, exchange, exc
        )
        return None
    finally:
        if gateway is None:
            await client.aclose()

    if not candles:
        return None

    # Try exact date match first
    for c in candles:
        if hasattr(c, "date") and c.date == target_date:
            return float(c.close)

    # Fall back: find closest date on or before target_date
    candidates = [
        c for c in candles
        if hasattr(c, "date") and c.date <= target_date
    ]
    if candidates:
        closest = max(candidates, key=lambda c: c.date)
        logger.debug(
            "Exact date %s not found for %s; using %s instead",
            target_date, symbol, closest.date,
        )
        return float(closest.close)

    # If all candles are after target_date, use the oldest available
    logger.debug(
        "No candle at or before %s for %s; using oldest available", target_date, symbol
    )
    oldest = min(candles, key=lambda c: c.date if hasattr(c, "date") else date.min)
    return float(oldest.close)


async def get_nifty50_close_on_date(
    target_date: date,
    *,
    gateway: GatewayClient | None = None,
) -> float | None:
    """Convenience wrapper for NIFTY50 benchmark price."""
    return await get_close_price_on_date(
        symbol=_NIFTY50_SYMBOL,
        target_date=target_date,
        exchange=_NIFTY50_EXCHANGE,
        gateway=gateway,
    )


def compute_return(entry: float, exit_: float) -> float:
    """Percentage return: (exit - entry) / entry."""
    if entry == 0:
        return 0.0
    return (exit_ - entry) / entry


def classify_outcome(raw_return: float, nifty_return: float) -> str:
    """Classify trade outcome based on alpha vs NIFTY50.

    WIN  → stock outperformed NIFTY by >2%
    LOSS → stock underperformed NIFTY by >2%
    NEUTRAL → within ±2% of benchmark
    """
    alpha = raw_return - nifty_return
    if alpha > 0.02:
        return "WIN"
    if alpha < -0.02:
        return "LOSS"
    return "NEUTRAL"
