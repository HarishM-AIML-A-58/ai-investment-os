"""Grounding: fetch real data per agent and render it into prompt context.

Each analyst node calls ``context_for`` to get a block of *real numbers* that is
appended to its prompt. The LLM then interprets actual data instead of relying
on parametric memory. Every fetch fails soft — on error the block is empty and
the agent is told data was unavailable (it must not invent).
"""

from __future__ import annotations

import logging
from typing import Protocol

from app.marketdata.indicators import compute_technical_snapshot
from app.marketdata.news import RssNews
from app.marketdata.nse import NseData

logger = logging.getLogger(__name__)


class GroundingProvider(Protocol):
    async def context_for(self, *, agent: str, symbol: str, exchange: str) -> str: ...


def _technical_block(snapshot) -> str:
    return (
        "Technical indicators (computed from real OHLCV):\n"
        f"- last_close: {snapshot.last_close}\n"
        f"- SMA20: {snapshot.sma_20}, SMA50: {snapshot.sma_50}\n"
        f"- RSI14: {snapshot.rsi_14}\n"
        f"- 20d momentum: {snapshot.momentum_20d_pct}%\n"
        f"- % from 52w high: {snapshot.pct_from_52w_high}%\n"
        f"- 20d avg volume: {snapshot.avg_volume_20d}\n"
        f"- candles available: {snapshot.candle_count}"
    )


def _news_block(headlines) -> str:
    if not headlines:
        return ""
    lines = "\n".join(f"- {h.title}" for h in headlines[:8])
    return f"Recent headlines (real RSS):\n{lines}"


def _fii_dii_block(rows) -> str:
    if not rows:
        return ""
    lines = []
    for r in rows[:4]:
        cat = r.get("category", "?")
        buy = r.get("buyValue", r.get("buy_value", "?"))
        sell = r.get("sellValue", r.get("sell_value", "?"))
        net = r.get("netValue", r.get("net_value", "?"))
        lines.append(f"- {cat}: buy={buy} sell={sell} net={net}")
    return "FII/DII cash activity (NSE official):\n" + "\n".join(lines)


def _fundamental_block(quote: dict | None) -> str:
    if not quote:
        return ""
    meta = quote.get("metadata", {}) if isinstance(quote, dict) else {}
    info = quote.get("info", {}) if isinstance(quote, dict) else {}
    pe = meta.get("pdSymbolPe")
    sector_pe = meta.get("pdSectorPe")
    industry = info.get("industry") or meta.get("industry")
    return (
        "Fundamentals (NSE official):\n"
        f"- symbol P/E: {pe}\n"
        f"- sector P/E: {sector_pe}\n"
        f"- industry: {industry}"
    )


class LiveGrounding:
    """Real grounding from Groww (gateway), NSE official, and RSS news."""

    def __init__(self, gateway=None, nse: NseData | None = None, news: RssNews | None = None) -> None:
        self._gateway = gateway
        self._nse = nse
        self._news = news

    async def context_for(self, *, agent: str, symbol: str, exchange: str) -> str:
        try:
            if agent == "technical" and self._gateway is not None:
                candles = await self._gateway.get_history(symbol, exchange)
                if candles:
                    return _technical_block(compute_technical_snapshot(candles))
            elif agent == "news" and self._news is not None:
                return _news_block(await self._news.fetch_headlines(query=symbol))
            elif agent == "institutional" and self._nse is not None:
                return _fii_dii_block(await self._nse.fii_dii())
            elif agent == "fundamental" and self._nse is not None:
                return _fundamental_block(await self._nse.equity_quote(symbol))
        except Exception as exc:  # noqa: BLE001 - grounding must never break a run
            logger.warning("grounding failed for agent=%s symbol=%s: %s", agent, symbol, exc)
        return ""
