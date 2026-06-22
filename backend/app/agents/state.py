"""LangGraph state schema for the analysis graph.

Extended to carry debate layer outputs alongside analyst scores.
"""

from __future__ import annotations

from typing import Annotated, TypedDict

from app.agents.llm.models import ScoreOutput
from app.engine.conviction.models import ComponentScores, ConvictionResult


def merge_scores(
    existing: dict[str, ScoreOutput] | None, new: dict[str, ScoreOutput]
) -> dict[str, ScoreOutput]:
    """Reducer: accumulate per-agent scores across nodes."""
    return {**(existing or {}), **new}


class AgentGraphState(TypedDict, total=False):
    # Core inputs
    symbol: str
    exchange: str
    context: str

    # Analyst outputs
    scores: Annotated[dict[str, ScoreOutput], merge_scores]
    component_scores: ComponentScores
    conviction: ConvictionResult

    # Debate layer outputs (populated by the debate node)
    debate_transcript: str       # Full bull/bear conversation
    debate_bull_history: str     # Bull arguments only
    debate_bear_history: str     # Bear arguments only
    investment_plan: str         # Research Manager's 3-sentence verdict
    conviction_adjustment: float # -20 to +20 applied to conviction.final
