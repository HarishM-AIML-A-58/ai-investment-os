"""Pure technical-indicator math computed from real OHLCV candles.

These produce the concrete NUMBERS that get injected into the Technical agent's
prompt, so the LLM interprets real data instead of inventing it.
"""

from __future__ import annotations

from pydantic import BaseModel

from app.gateway.models import Candle


class TechnicalSnapshot(BaseModel):
    last_close: float
    sma_20: float | None
    sma_50: float | None
    rsi_14: float | None
    momentum_20d_pct: float | None
    pct_from_52w_high: float | None
    avg_volume_20d: float | None
    candle_count: int


def _sma(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    return sum(values[-period:]) / period


def _rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    gains = 0.0
    losses = 0.0
    # Seed average over the first `period` deltas.
    for i in range(-period, 0):
        delta = closes[i] - closes[i - 1]
        if delta >= 0:
            gains += delta
        else:
            losses -= delta
    avg_gain = gains / period
    avg_loss = losses / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100.0 - (100.0 / (1.0 + rs)), 2)


def compute_technical_snapshot(candles: list[Candle]) -> TechnicalSnapshot:
    closes = [c.close for c in candles]
    volumes = [c.volume for c in candles]
    highs = [c.high for c in candles]

    last_close = closes[-1] if closes else 0.0
    momentum = None
    if len(closes) > 20 and closes[-21] != 0:
        momentum = round((closes[-1] / closes[-21] - 1.0) * 100.0, 2)

    pct_from_high = None
    if highs:
        window = highs[-252:] if len(highs) >= 252 else highs
        high_52w = max(window)
        if high_52w != 0:
            pct_from_high = round((last_close / high_52w - 1.0) * 100.0, 2)

    return TechnicalSnapshot(
        last_close=round(last_close, 2),
        sma_20=round(s, 2) if (s := _sma(closes, 20)) is not None else None,
        sma_50=round(s, 2) if (s := _sma(closes, 50)) is not None else None,
        rsi_14=_rsi(closes, 14),
        momentum_20d_pct=momentum,
        pct_from_52w_high=pct_from_high,
        avg_volume_20d=round(v, 2) if (v := _sma(volumes, 20)) is not None else None,
        candle_count=len(candles),
    )
