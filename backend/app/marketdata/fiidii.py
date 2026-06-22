"""FII/DII institutional flow aggregator.

Wraps the existing NseData client to provide a processed, cached view of
7-day net institutional flows with a derived signal score (0-100).

Result is cached for 1 hour — safe to call from multiple Celery tasks and
API handlers in the same process.
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


async def get_fiidii(force_refresh: bool = False) -> dict:
    """Return processed FII/DII data with a signal score.

    Keys: score (0-100), net_7day_fii, net_7day_dii, entries, cached, fetched_at
    """
    global _cache, _cache_ts

    now = time.monotonic()
    if not force_refresh and _cache and (now - _cache_ts) < _CACHE_TTL:
        return {**_cache, "cached": True}

    async with _lock:
        if not force_refresh and _cache and (time.monotonic() - _cache_ts) < _CACHE_TTL:
            return {**_cache, "cached": True}

        result = await _fetch_and_process()
        _cache = result
        _cache_ts = time.monotonic()
        return {**result, "cached": False}


async def _fetch_and_process() -> dict:
    import datetime

    fetched_at = datetime.datetime.utcnow().isoformat() + "Z"
    try:
        from app.marketdata.nse import NseData

        async with NseData() as nse:
            raw = await nse.fii_dii()

        entries = _parse_entries(raw[:7])
        net_fii = sum(e["fii_net"] for e in entries)
        net_dii = sum(e["dii_net"] for e in entries)

        # Score: 0-100 based on combined net flow direction and magnitude
        combined = net_fii + net_dii
        if combined > 5000:
            score = 80.0
        elif combined > 1000:
            score = 65.0
        elif combined > 0:
            score = 55.0
        elif combined > -1000:
            score = 45.0
        elif combined > -5000:
            score = 35.0
        else:
            score = 20.0

        return {
            "score": round(score, 2),
            "net_7day_fii": round(net_fii, 2),
            "net_7day_dii": round(net_dii, 2),
            "entries": entries,
            "fetched_at": fetched_at,
        }

    except Exception as exc:
        logger.warning("FII/DII fetch failed: %s", exc)
        return {
            "score": 50.0,
            "net_7day_fii": 0.0,
            "net_7day_dii": 0.0,
            "entries": [],
            "error": str(exc),
            "fetched_at": fetched_at,
        }


def _parse_entries(raw: list[dict]) -> list[dict]:
    entries = []
    for row in raw:
        try:
            # NSE API field names vary — handle both old and new formats
            date = (
                row.get("date")
                or row.get("trading_date")
                or row.get("tradingDate")
                or ""
            )

            def _cr(key_variants: list[str]) -> float:
                for k in key_variants:
                    v = row.get(k)
                    if v is not None:
                        try:
                            return float(str(v).replace(",", ""))
                        except (ValueError, TypeError):
                            pass
                return 0.0

            fii_net = _cr(["FII_NET", "fii_net", "fiinet", "net_purchase_sales"])
            dii_net = _cr(["DII_NET", "dii_net", "diinet"])

            entries.append({"date": str(date), "fii_net": fii_net, "dii_net": dii_net})
        except Exception:
            continue
    return entries


async def fiidii_to_score() -> float:
    """Return only the signal score (0-100) — used by institutional agent."""
    data = await get_fiidii()
    return float(data.get("score", 50.0))
