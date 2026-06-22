"""LangGraph analysis graph tests with a deterministic stub LLM (no DB)."""

from __future__ import annotations

import pytest

from app.agents.graph import build_graph
from app.agents.llm import StubLLM
from app.domain.enums import RecommendationBand

STUB_SCORES = {
    "fundamental": 85.0,
    "technical": 78.0,
    "news": 90.0,
    "sector": 88.0,
    "institutional": 82.0,
    "risk": 70.0,
}


async def test_graph_produces_conviction() -> None:
    graph = build_graph(StubLLM(STUB_SCORES))
    final = await graph.ainvoke({"symbol": "TCS", "context": "test"})

    # All six analysts contributed.
    assert set(final["scores"].keys()) == set(STUB_SCORES.keys())

    comp = final["component_scores"]
    assert comp.fundamentals == pytest.approx(85.0)
    assert comp.risk == pytest.approx(70.0)

    # 0.30*85 + 0.25*78 + 0.15*90 + 0.15*88 + 0.15*82 = 84.0 (risk >= floor)
    conviction = final["conviction"]
    assert conviction.final == pytest.approx(84.0)
    assert conviction.band is RecommendationBand.BUY
    assert len(conviction.breakdown) == 5


async def test_graph_risk_derating_flows_through() -> None:
    scores = {**STUB_SCORES, "risk": 25.0}
    graph = build_graph(StubLLM(scores))
    final = await graph.ainvoke({"symbol": "INFY"})

    conviction = final["conviction"]
    assert conviction.risk_derated is True
    assert conviction.final == pytest.approx(42.0)  # 84.0 * 0.5
    assert conviction.band is RecommendationBand.AVOID
