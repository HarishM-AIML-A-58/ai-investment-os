"""Debate LangGraph sub-graph.

Topology:
  START → bull → conditional → bear → conditional → ... → research_manager → END

The conditional logic alternates between bull and bear until the round limit is
reached, then routes to the Research Manager for a verdict.

Default: 2 rounds = 4 messages (bull, bear, bull, bear) then judgment.
This is configurable via MAX_DEBATE_ROUNDS.
"""

from __future__ import annotations

import logging

from langgraph.graph import END, START, StateGraph

from app.agents.debate.bear_researcher import bear_researcher_node
from app.agents.debate.bull_researcher import bull_researcher_node
from app.agents.debate.research_manager import research_manager_node
from app.agents.debate.state import DebateState
from app.agents.llm.base import LLMClient

logger = logging.getLogger(__name__)

# 2 rounds = 4 turns (bull + bear + bull + bear) before the manager judges.
# Increase to 3 for deeper debate at higher LLM cost.
MAX_DEBATE_ROUNDS = 2


def _should_continue(state: DebateState) -> str:
    """Route: continue debating or send to Research Manager judge."""
    count = state.get("count", 0)
    if count >= MAX_DEBATE_ROUNDS * 2:
        logger.debug("Debate reached %d turns — routing to Research Manager", count)
        return "research_manager"

    current = state.get("current_response", "")
    if current.startswith("Bull"):
        return "bear"
    return "bull"


def build_debate_graph(llm: LLMClient):
    """Compile the debate sub-graph bound to the given LLM client."""
    graph = StateGraph(DebateState)

    # Bind LLM via closures so nodes are plain callables
    graph.add_node("bull", lambda s: bull_researcher_node(s, llm))
    graph.add_node("bear", lambda s: bear_researcher_node(s, llm))
    graph.add_node("research_manager", lambda s: research_manager_node(s, llm))

    # Bull always speaks first
    graph.add_edge(START, "bull")

    # After bull: check if we continue or go to manager
    graph.add_conditional_edges(
        "bull",
        _should_continue,
        {"bear": "bear", "research_manager": "research_manager"},
    )
    # After bear: check again
    graph.add_conditional_edges(
        "bear",
        _should_continue,
        {"bull": "bull", "research_manager": "research_manager"},
    )

    graph.add_edge("research_manager", END)

    return graph.compile()
