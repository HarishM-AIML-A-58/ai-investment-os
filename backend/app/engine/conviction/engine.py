"""Conviction Engine — deterministic, explainable, versioned scoring."""

from __future__ import annotations

from app.domain.enums import RecommendationBand
from app.engine.conviction.models import (
    WEIGHTED_COMPONENTS,
    ComponentContribution,
    ComponentScores,
    ConvictionResult,
    ConvictionWeights,
)

ENGINE_VERSION = "conviction-1.0.0"

DEFAULT_RISK_FLOOR = 50.0
DEFAULT_BUY_THRESHOLD = 75.0
DEFAULT_HOLD_THRESHOLD = 50.0


class ConvictionEngine:
    """Compute an explainable conviction score from component scores.

    ``final = (weighted sum of opportunity components) * risk_factor``
    where ``risk_factor = risk / risk_floor`` when ``risk < risk_floor`` else 1.0.
    """

    def __init__(
        self,
        weights: ConvictionWeights | None = None,
        risk_floor: float = DEFAULT_RISK_FLOOR,
        buy_threshold: float = DEFAULT_BUY_THRESHOLD,
        hold_threshold: float = DEFAULT_HOLD_THRESHOLD,
    ) -> None:
        if not 0 < risk_floor <= 100:
            raise ValueError("risk_floor must be in (0, 100]")
        if not 0 <= hold_threshold <= buy_threshold <= 100:
            raise ValueError("require 0 <= hold_threshold <= buy_threshold <= 100")
        self.weights = weights or ConvictionWeights()
        self.risk_floor = risk_floor
        self.buy_threshold = buy_threshold
        self.hold_threshold = hold_threshold

    def _band(self, final: float) -> RecommendationBand:
        if final >= self.buy_threshold:
            return RecommendationBand.BUY
        if final >= self.hold_threshold:
            return RecommendationBand.HOLD
        return RecommendationBand.AVOID

    def score(self, components: ComponentScores) -> ConvictionResult:
        breakdown: list[ComponentContribution] = []
        base = 0.0
        for name in WEIGHTED_COMPONENTS:
            weight = getattr(self.weights, name)
            value = getattr(components, name)
            contribution = weight * value
            base += contribution
            breakdown.append(
                ComponentContribution(
                    component=name,
                    score=value,
                    weight=weight,
                    contribution=round(contribution, 4),
                )
            )

        if components.risk < self.risk_floor:
            risk_factor = components.risk / self.risk_floor
            risk_derated = True
        else:
            risk_factor = 1.0
            risk_derated = False

        final = base * risk_factor

        return ConvictionResult(
            final=round(final, 2),
            base=round(base, 2),
            band=self._band(final),
            risk_score=components.risk,
            risk_floor=self.risk_floor,
            risk_factor=round(risk_factor, 4),
            risk_derated=risk_derated,
            breakdown=breakdown,
            engine_version=ENGINE_VERSION,
        )
