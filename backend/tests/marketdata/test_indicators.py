"""Technical indicator math tests (pure)."""

from __future__ import annotations

import pytest

from app.gateway.models import Candle
from app.marketdata.indicators import compute_technical_snapshot


def _candles(closes: list[float]) -> list[Candle]:
    return [
        Candle(timestamp=f"2026-01-{i + 1:02d}", open=c, high=c + 1, low=c - 1, close=c, volume=1000.0)
        for i, c in enumerate(closes)
    ]


def test_sma_and_counts() -> None:
    closes = [float(x) for x in range(1, 61)]  # 1..60
    snap = compute_technical_snapshot(_candles(closes))
    assert snap.candle_count == 60
    assert snap.last_close == 60.0
    # SMA20 of 41..60 = 50.5 ; SMA50 of 11..60 = 35.5
    assert snap.sma_20 == pytest.approx(50.5)
    assert snap.sma_50 == pytest.approx(35.5)


def test_rsi_all_gains_is_100() -> None:
    closes = [float(x) for x in range(1, 40)]  # strictly increasing
    snap = compute_technical_snapshot(_candles(closes))
    assert snap.rsi_14 == 100.0


def test_momentum_and_pct_from_high() -> None:
    closes = [100.0] * 21 + [110.0]  # 22 candles; 20d-ago close = index -21 = 100
    snap = compute_technical_snapshot(_candles(closes))
    assert snap.momentum_20d_pct == pytest.approx(10.0)
    # 52w high uses candle highs (= close + 1 here): max high 111 vs close 110.
    assert snap.pct_from_52w_high == pytest.approx(-0.9)


def test_short_series_yields_none_indicators() -> None:
    snap = compute_technical_snapshot(_candles([10.0, 11.0, 12.0]))
    assert snap.sma_20 is None
    assert snap.rsi_14 is None
    assert snap.candle_count == 3
