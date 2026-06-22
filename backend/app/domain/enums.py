"""Core domain enumerations shared across engines and agents."""

from __future__ import annotations

from enum import Enum


class TradeSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class RiskProfile(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class MarketRegime(str, Enum):
    BULL = "bull"
    BEAR = "bear"
    SIDEWAYS = "sideways"
    HIGH_VOLATILITY = "high_volatility"


class RecommendationBand(str, Enum):
    """Suggested action band derived from the conviction score."""

    BUY = "buy"
    HOLD = "hold"
    AVOID = "avoid"


class AutonomyTier(int, Enum):
    """Graduated execution autonomy.

    PROPOSE  : agent proposes, human confirms every trade.
    CAPPED   : auto-fire only within a per-trade value cap and conviction floor.
    FULL     : auto-fire any trade that clears the deterministic gates.
    """

    PROPOSE = 0
    CAPPED = 1
    FULL = 2


class Decision(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
