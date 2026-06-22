"""Conviction Engine I/O models.

Scoring is a weighted sum of five *opportunity* components, then a multiplicative
**risk de-rating cap** is applied. Risk is intentionally NOT part of the weighted
sum (that would double-count it) — instead a poor risk score scales the whole
conviction down. Every result carries a full, explainable breakdown.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from app.domain.enums import RecommendationBand

# The five weighted opportunity components (risk is handled separately).
WEIGHTED_COMPONENTS: tuple[str, ...] = (
    "fundamentals",
    "technicals",
    "news",
    "sector_strength",
    "institutional_activity",
)


class ComponentScores(BaseModel):
    """Agent-produced component scores, each on a 0-100 scale.

    ``risk`` is a *safety* score: higher means safer (lower risk).
    """

    fundamentals: float = Field(ge=0, le=100)
    technicals: float = Field(ge=0, le=100)
    news: float = Field(ge=0, le=100)
    sector_strength: float = Field(ge=0, le=100)
    institutional_activity: float = Field(ge=0, le=100)
    risk: float = Field(ge=0, le=100)


class ConvictionWeights(BaseModel):
    """Weights for the five opportunity components. Must sum to ~1.0."""

    fundamentals: float = Field(default=0.30, ge=0, le=1)
    technicals: float = Field(default=0.25, ge=0, le=1)
    news: float = Field(default=0.15, ge=0, le=1)
    sector_strength: float = Field(default=0.15, ge=0, le=1)
    institutional_activity: float = Field(default=0.15, ge=0, le=1)

    @model_validator(mode="after")
    def _weights_sum_to_one(self) -> ConvictionWeights:
        total = sum(getattr(self, c) for c in WEIGHTED_COMPONENTS)
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"conviction weights must sum to 1.0, got {total:.6f}")
        return self


class ComponentContribution(BaseModel):
    component: str
    score: float
    weight: float
    contribution: float


class ConvictionResult(BaseModel):
    final: float
    base: float
    band: RecommendationBand
    risk_score: float
    risk_floor: float
    risk_factor: float
    risk_derated: bool
    breakdown: list[ComponentContribution]
    engine_version: str
