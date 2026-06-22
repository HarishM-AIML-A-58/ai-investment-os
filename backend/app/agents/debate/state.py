"""Debate state schema for the bull/bear investment debate.

The debate runs as a LangGraph sub-graph with its own state, separate from
the main AgentGraphState. On completion, only ``debate_transcript``,
``investment_plan``, and ``conviction_adjustment`` are surfaced back to the
parent graph.
"""

from __future__ import annotations

from typing import TypedDict


class DebateState(TypedDict, total=False):
    symbol: str
    # Full analyst reports keyed by agent name — passed in from parent graph
    analyst_reports: dict[str, str]
    # Initial numeric scores from each analyst — used for context
    component_scores: dict[str, float]
    # Running transcript
    history: str
    bull_history: str
    bear_history: str
    current_response: str
    count: int
    # Research Manager output
    judge_decision: str
    investment_plan: str
    # Score modifier applied to the conviction engine output (-20 to +20)
    conviction_adjustment: float
