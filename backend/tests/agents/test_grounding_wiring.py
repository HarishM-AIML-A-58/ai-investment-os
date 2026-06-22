"""Prove that grounded data reaches the analyst prompt (no network)."""

from __future__ import annotations

from app.agents.graph import build_graph
from app.agents.llm.models import ScoreOutput


class SpyLLM:
    """Records the user prompt each analyst received."""

    def __init__(self) -> None:
        self.prompts: dict[str, str] = {}

    async def score(self, *, agent: str, system: str, user: str) -> ScoreOutput:
        self.prompts[agent] = user
        return ScoreOutput(score=75.0, rationale="spy")


class FakeGrounding:
    """Returns a unique marker block per agent."""

    async def context_for(self, *, agent: str, symbol: str, exchange: str) -> str:
        return f"MARKER[{agent}:{symbol}:{exchange}]"


async def test_grounding_block_is_injected_into_prompts() -> None:
    spy = SpyLLM()
    graph = build_graph(spy, grounding=FakeGrounding())
    await graph.ainvoke({"symbol": "TCS", "exchange": "NSE", "context": "t"})

    # Every analyst's prompt must contain its grounded data block.
    for agent in ("fundamental", "technical", "news", "sector", "institutional", "risk"):
        assert f"MARKER[{agent}:TCS:NSE]" in spy.prompts[agent]
        assert "do not invent" in spy.prompts[agent]


async def test_no_grounding_means_no_marker() -> None:
    spy = SpyLLM()
    graph = build_graph(spy, grounding=None)
    await graph.ainvoke({"symbol": "TCS", "exchange": "NSE"})
    assert "MARKER" not in spy.prompts["technical"]
    assert "LIVE DATA" not in spy.prompts["technical"]
