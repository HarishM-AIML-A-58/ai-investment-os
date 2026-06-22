"""Short-term volatility sizer for entry, stop loss, and target prices."""

from __future__ import annotations

import logging
from pydantic import BaseModel
from app.gateway.models import Candle

logger = logging.getLogger(__name__)


class VolatilitySetup(BaseModel):
    entry_price: float
    stop_loss: float
    target_price: float
    atr: float


class VolatilityEngine:
    @staticmethod
    def compute_tr(current_candle: Candle, previous_candle: Candle | None) -> float:
        high = current_candle.high
        low = current_candle.low
        tr = high - low
        
        if previous_candle is not None:
            prev_close = previous_candle.close
            tr = max(tr, abs(high - prev_close), abs(low - prev_close))
            
        return tr

    @staticmethod
    def calculate_atr(candles: list[Candle], period: int = 14) -> float:
        if len(candles) < 2:
            return 0.0
            
        tr_values: list[float] = []
        for i in range(len(candles)):
            prev = candles[i - 1] if i > 0 else None
            tr_values.append(VolatilityEngine.compute_tr(candles[i], prev))
            
        effective_period = min(period, len(tr_values))
        if effective_period <= 0:
            return 0.0
            
        return sum(tr_values[-effective_period:]) / effective_period

    def calculate_setup(
        self,
        candles: list[Candle],
        atr_period: int = 14,
        base_multiplier: float = 2.0,
        risk_reward_ratio: float = 2.0
    ) -> VolatilitySetup | None:
        if not candles:
            return None
            
        latest_candle = candles[-1]
        entry = latest_candle.close
        
        # Fallback to 2.5% of price if ATR cannot be computed
        if len(candles) < 5:
            atr = entry * 0.025
        else:
            atr = self.calculate_atr(candles, period=atr_period)
            if atr <= 0.0:
                atr = entry * 0.025
                
        sl_offset = base_multiplier * atr
        
        stop_loss = round(entry - sl_offset, 2)
        target_price = round(entry + (sl_offset * risk_reward_ratio), 2)
        
        return VolatilitySetup(
            entry_price=round(entry, 2),
            stop_loss=stop_loss,
            target_price=target_price,
            atr=round(atr, 2)
        )
