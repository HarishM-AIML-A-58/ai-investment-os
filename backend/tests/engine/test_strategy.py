"""Unit tests for the long-term health scorer and volatility sizing strategies."""

from __future__ import annotations

import pytest
from app.gateway.models import Candle
from app.engine.strategy.health import LongTermHealthScorer
from app.engine.strategy.volatility import VolatilityEngine, VolatilitySetup


class MockLLMClient:
    def __init__(self, response_text: str, should_fail: bool = False) -> None:
        self.response_text = response_text
        self.should_fail = should_fail
        self.calls = []

    async def summarize(self, *, system: str, user: str) -> str:
        self.calls.append((system, user))
        if self.should_fail:
            raise Exception("Mock LLM error")
        return self.response_text

    async def score(self, *, agent: str, system: str, user: str):
        pass


@pytest.mark.asyncio
async def test_health_scorer_llm_parse_success() -> None:
    response = '{"health_score": 85.5, "is_value_trap": false, "reasons": ["Growing revenues", "PE under industry avg"]}'
    llm = MockLLMClient(response)
    scorer = LongTermHealthScorer(llm)
    
    quote = {
        "metadata": {"pdSymbolPe": "22.4", "pdSectorPe": "25.1"},
        "info": {"industry": "Software"}
    }
    result = await scorer.analyze("TCS", quote, "TCS reports solid earnings.")
    
    assert result.health_score == 85.5
    assert result.is_value_trap is False
    assert "Growing revenues" in result.reasons
    assert len(llm.calls) == 1


@pytest.mark.asyncio
async def test_health_scorer_fallback_negative_pe() -> None:
    # LLM fails, should fall back to deterministic negative PE rule
    llm = MockLLMClient("", should_fail=True)
    scorer = LongTermHealthScorer(llm)
    
    quote = {
        "metadata": {"pdSymbolPe": "-12.5", "pdSectorPe": "18.0"},
        "info": {"industry": "Tech"}
    }
    result = await scorer.analyze("STARTUP", quote, "")
    
    assert result.health_score == 40.0
    assert result.is_value_trap is True
    assert "Negative P/E ratio indicates negative earnings." in result.reasons


@pytest.mark.asyncio
async def test_health_scorer_fallback_high_pe() -> None:
    llm = MockLLMClient("", should_fail=True)
    scorer = LongTermHealthScorer(llm)
    
    quote = {
        "metadata": {"pdSymbolPe": "90.0", "pdSectorPe": "30.0"},
        "info": {"industry": "Tech"}
    }
    result = await scorer.analyze("BUBBLE", quote, "")
    
    assert result.health_score == 50.0
    assert result.is_value_trap is False
    assert "Premium valuation: P/E is 2.5x higher than sector average." in result.reasons


def test_volatility_tr_calculation() -> None:
    c1 = Candle(timestamp="2026-06-01", open=100.0, high=105.0, low=98.0, close=102.0)
    c2 = Candle(timestamp="2026-06-02", open=102.0, high=110.0, low=101.0, close=108.0)
    
    # TR when no previous candle = high - low = 105 - 98 = 7
    tr1 = VolatilityEngine.compute_tr(c1, None)
    assert tr1 == pytest.approx(7.0)
    
    # TR when previous candle exists
    # max(high - low, abs(high - prev_close), abs(low - prev_close))
    # max(110-101, abs(110-102), abs(101-102)) = max(9, 8, 1) = 9
    tr2 = VolatilityEngine.compute_tr(c2, c1)
    assert tr2 == pytest.approx(9.0)


def test_volatility_atr_calculation() -> None:
    candles = [
        Candle(timestamp=f"2026-06-{i:02d}", open=100.0, high=100.0 + i, low=100.0 - i, close=100.0)
        for i in range(1, 10)
    ]
    # Simple ATR over last 5 days
    atr = VolatilityEngine.calculate_atr(candles, period=5)
    # TR values computed:
    # c_0: high 101, low 99 -> TR = 2
    # c_1: high 102, low 98, prev_close 100 -> TR = max(4, 2, 2) = 4
    # c_2: high 103, low 97, prev_close 100 -> TR = max(6, 3, 3) = 6
    # c_3: high 104, low 96, prev_close 100 -> TR = max(8, 4, 4) = 8
    # c_4: high 105, low 95, prev_close 100 -> TR = max(10, 5, 5) = 10
    # c_5: high 106, low 94, prev_close 100 -> TR = max(12, 6, 6) = 12
    # c_6: high 107, low 93, prev_close 100 -> TR = max(14, 7, 7) = 14
    # c_7: high 108, low 92, prev_close 100 -> TR = max(16, 8, 8) = 16
    # c_8: high 109, low 91, prev_close 100 -> TR = max(18, 9, 9) = 18
    # Last 5 TRs: 10, 12, 14, 16, 18 -> avg = (10+12+14+16+18)/5 = 70/5 = 14
    assert atr == pytest.approx(14.0)


def test_volatility_setup_calculation() -> None:
    candles = [
        Candle(timestamp="2026-06-01", open=100, high=102, low=98, close=100),
        Candle(timestamp="2026-06-02", open=100, high=104, low=96, close=100),
        Candle(timestamp="2026-06-03", open=100, high=106, low=94, close=100),
        Candle(timestamp="2026-06-04", open=100, high=108, low=92, close=100),
        Candle(timestamp="2026-06-05", open=100, high=110, low=90, close=100),
    ]
    # TRs: 4, 8, 12, 16, 20
    # ATR(period=3) on last 3 TRs: (12+16+20)/3 = 16
    engine = VolatilityEngine()
    setup = engine.calculate_setup(candles, atr_period=3, base_multiplier=2.0, risk_reward_ratio=2.0)
    
    assert setup is not None
    assert setup.entry_price == 100.0
    assert setup.atr == 16.0
    # SL = Entry - 2 * ATR = 100 - 32 = 68
    assert setup.stop_loss == 68.0
    # TP = Entry + (2 * ATR * 2) = 100 + 64 = 164
    assert setup.target_price == 164.0
