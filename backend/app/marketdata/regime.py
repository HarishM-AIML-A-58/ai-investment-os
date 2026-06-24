"""NIFTY50 market regime detector.

Determines the current macro regime (bull / bear / sideways / high_vol) from
NIFTY50 price history. Results are cached for 1 hour to avoid repeated
yfinance calls during the same Celery task batch.

Regime rules (priority order):
  1. high_vol  — ATR14 / price > 0.025 (volatility threshold)
  2. bull      — price > SMA200 AND SMA20 > SMA50
  3. bear      — price < SMA200 AND SMA20 < SMA50
  4. sideways  — everything else
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

_CACHE_TTL = 3600  # 1 hour
_cache: dict[str, Any] = {}
_cache_ts: float = 0.0
_lock = asyncio.Lock()


async def get_regime(force_refresh: bool = False) -> dict:
    """Return the current NIFTY50 regime as a dict.

    Keys: regime, confidence, details, cached, computed_at
    """
    global _cache, _cache_ts

    now = time.monotonic()
    if not force_refresh and _cache and (now - _cache_ts) < _CACHE_TTL:
        return {**_cache, "cached": True}

    async with _lock:
        # Re-check inside lock
        if not force_refresh and _cache and (time.monotonic() - _cache_ts) < _CACHE_TTL:
            return {**_cache, "cached": True}

        result = await _compute_regime_async()
        _cache = result
        _cache_ts = time.monotonic()
        return {**result, "cached": False}


async def _compute_regime_async() -> dict:
    """Async regime calculation using official Groww MCP historical daily candles."""
    import datetime
    from app.mcp.manager import get_mcp_manager

    try:
        candles = await get_mcp_manager().fetch_history("NIFTY", exchange="NSE", days=250)
        if not candles or len(candles) < 30:
            raise ValueError("Insufficient NIFTY50 history from Groww MCP")

        closes = [float(c.get("close") or c.get("Close") or c.get("close_price") or 0) for c in candles]
        highs = [float(c.get("high") or c.get("High") or 0) for c in candles]
        lows = [float(c.get("low") or c.get("Low") or 0) for c in candles]

        # Verify we have valid numeric entries
        closes = [c for c in closes if c > 0]
        highs = [h for h in highs if h > 0]
        lows = [l for l in lows if l > 0]

        if len(closes) < 30:
            raise ValueError("Invalid close values in history")

        price = closes[-1]
        sma20 = sum(closes[-20:]) / 20
        sma50 = sum(closes[-50:]) / min(50, len(closes))
        sma200 = sum(closes[-200:]) / min(200, len(closes))

        # ATR14
        tr_values = []
        for i in range(1, 15):
            tr = max(
                highs[-i] - lows[-i],
                abs(highs[-i] - closes[-(i + 1)]),
                abs(lows[-i] - closes[-(i + 1)]),
            )
            tr_values.append(tr)
        atr14 = sum(tr_values) / len(tr_values)
        atr_pct = atr14 / price

        # Regime classification
        if atr_pct > 0.025:
            regime = "high_vol"
            confidence = min(1.0, atr_pct / 0.04)
        elif price > sma200 and sma20 > sma50:
            regime = "bull"
            confidence = min(1.0, (price - sma200) / sma200 * 10)
        elif price < sma200 and sma20 < sma50:
            regime = "bear"
            confidence = min(1.0, (sma200 - price) / sma200 * 10)
        else:
            regime = "sideways"
            confidence = 0.5

        return {
            "regime": regime,
            "confidence": round(confidence, 3),
            "details": {
                "price": round(price, 2),
                "sma20": round(sma20, 2),
                "sma50": round(sma50, 2),
                "sma200": round(sma200, 2),
                "atr14": round(atr14, 2),
                "atr_pct": round(atr_pct * 100, 3),
            },
            "computed_at": datetime.datetime.utcnow().isoformat() + "Z",
        }

    except Exception as exc:
        logger.warning("Regime computation failed: %s", exc)
        import datetime
        return {
            "regime": "unknown",
            "confidence": 0.0,
            "details": {"error": str(exc)},
            "computed_at": datetime.datetime.utcnow().isoformat() + "Z",
        }


def regime_to_score(regime: str) -> float:
    """Map regime label → 0-100 institutional score contribution."""
    return {"bull": 80.0, "sideways": 50.0, "high_vol": 35.0, "bear": 20.0}.get(regime, 50.0)
