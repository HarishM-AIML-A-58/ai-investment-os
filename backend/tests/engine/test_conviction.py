"""Conviction Engine unit tests (pure, no dependencies)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domain.enums import RecommendationBand
from app.engine.conviction import (
    ComponentScores,
    ConvictionEngine,
    ConvictionWeights,
)


def _scores(**overrides) -> ComponentScores:
    base = dict(
        fundamentals=85,
        technicals=78,
        news=90,
        sector_strength=88,
        institutional_activity=82,
        risk=70,
    )
    base.update(overrides)
    return ComponentScores(**base)


def test_known_weighted_sum() -> None:
    # 0.30*85 + 0.25*78 + 0.15*90 + 0.15*88 + 0.15*82 = 84.0
    result = ConvictionEngine().score(_scores())
    assert result.base == pytest.approx(84.0)
    assert result.risk_derated is False
    assert result.risk_factor == pytest.approx(1.0)
    assert result.final == pytest.approx(84.0)
    assert result.band is RecommendationBand.BUY
    assert result.engine_version == "conviction-1.0.0"


def test_breakdown_sums_to_base() -> None:
    result = ConvictionEngine().score(_scores())
    assert sum(c.contribution for c in result.breakdown) == pytest.approx(
        result.base, abs=0.01
    )
    assert len(result.breakdown) == 5  # risk is not a weighted component


def test_risk_derating_applies_below_floor() -> None:
    # risk 25 < floor 50 -> factor 0.5 -> 84.0 * 0.5 = 42.0
    result = ConvictionEngine().score(_scores(risk=25))
    assert result.risk_derated is True
    assert result.risk_factor == pytest.approx(0.5)
    assert result.final == pytest.approx(42.0)
    assert result.band is RecommendationBand.AVOID


def test_risk_at_floor_is_not_derated() -> None:
    result = ConvictionEngine().score(_scores(risk=50))
    assert result.risk_derated is False
    assert result.final == pytest.approx(84.0)


@pytest.mark.parametrize(
    ("uniform", "expected"),
    [
        (80, RecommendationBand.BUY),
        (60, RecommendationBand.HOLD),
        (40, RecommendationBand.AVOID),
    ],
)
def test_band_thresholds(uniform: int, expected: RecommendationBand) -> None:
    # risk kept high (80) so banding reflects the base score, not de-rating.
    scores = ComponentScores(
        fundamentals=uniform,
        technicals=uniform,
        news=uniform,
        sector_strength=uniform,
        institutional_activity=uniform,
        risk=80,
    )
    result = ConvictionEngine().score(scores)
    assert result.final == pytest.approx(float(uniform))
    assert result.band is expected


def test_weights_must_sum_to_one() -> None:
    with pytest.raises(ValidationError):
        ConvictionWeights(
            fundamentals=0.5,
            technicals=0.5,
            news=0.5,
            sector_strength=0.5,
            institutional_activity=0.5,
        )


def test_score_out_of_range_rejected() -> None:
    with pytest.raises(ValidationError):
        ComponentScores(
            fundamentals=150,
            technicals=80,
            news=80,
            sector_strength=80,
            institutional_activity=80,
            risk=80,
        )


def test_invalid_thresholds_rejected() -> None:
    with pytest.raises(ValueError):
        ConvictionEngine(buy_threshold=40, hold_threshold=60)  # hold > buy
