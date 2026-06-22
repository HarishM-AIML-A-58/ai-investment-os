"""LangGraph analysis graph — upgraded with debate layer.

Pipeline:
  START → fundamental → technical → news → sector → institutional → risk
        → debate (bull ↔ bear × N rounds → research_manager)
        → decision
        → END

Analysts emit scores (0-100) + full markdown reports. The debate layer reads
all 6 reports and runs a bull/bear argument cycle. The Research Manager judge
produces a conviction_adjustment (-20 to +20) applied to the base score.
The decision node assembles everything into an explainable ConvictionResult.

The graph performs NO side effects and NO execution — persistence and the
deterministic gate live downstream of it.
"""

from __future__ import annotations

import logging

from langgraph.graph import END, START, StateGraph

from app.agents.debate.graph import build_debate_graph
from app.agents.llm.base import LLMClient
from app.agents.prompts import ANALYST_ORDER, ANALYST_PROMPTS
from app.agents.state import AgentGraphState
from app.engine.conviction import ComponentScores, ConvictionEngine

logger = logging.getLogger(__name__)

# Maps analyst keys → ConvictionEngine component fields.
_COMPONENT_FIELD = {
    "fundamental": "fundamentals",
    "technical": "technicals",
    "news": "news",
    "sector": "sector_strength",
    "institutional": "institutional_activity",
    "risk": "risk",
}


def _user_prompt(state: AgentGraphState) -> str:
    symbol = state.get("symbol", "")
    context = state.get("context", "")
    base = (
        f"Analyse {symbol} for a medium-term investment (3–12 month horizon) "
        f"on the Indian equity market (NSE/BSE)."
    )
    return f"{base}\n\nContext:\n{context}" if context else base


def _make_analyst(agent_key: str, llm: LLMClient, system: str, grounding=None):
    """Factory: returns an async graph node for one analyst."""

    async def node(state: AgentGraphState) -> dict:
        user = _user_prompt(state)
        if grounding is not None:
            try:
                block = await grounding.context_for(
                    agent=agent_key,
                    symbol=state.get("symbol", ""),
                    exchange=state.get("exchange", "NSE"),
                )
                if block:
                    user = (
                        f"{user}\n\nLIVE DATA (use these figures; do not invent):\n{block}"
                    )
            except Exception as exc:
                logger.warning(
                    "Grounding context_for failed for agent=%s: %s", agent_key, exc
                )

        output = await llm.score(agent=agent_key, system=system, user=user)
        return {"scores": {agent_key: output}}

    return node


async def _debate_node(state: AgentGraphState, llm: LLMClient) -> dict:
    """Run the bull/bear debate sub-graph and return the debate outputs."""
    scores = state.get("scores", {})

    # Build analyst reports dict from score outputs
    analyst_reports = {
        key: scores[key].report
        for key in ANALYST_ORDER
        if key in scores and scores[key].report
    }

    component_scores_dict = {
        key: scores[key].score
        for key in ANALYST_ORDER
        if key in scores
    }

    debate_initial_state = {
        "symbol": state.get("symbol", ""),
        "analyst_reports": analyst_reports,
        "component_scores": component_scores_dict,
        "history": "",
        "bull_history": "",
        "bear_history": "",
        "current_response": "",
        "count": 0,
        "conviction_adjustment": 0.0,
    }

    try:
        debate_graph = build_debate_graph(llm)
        result = await debate_graph.ainvoke(debate_initial_state)
        return {
            "debate_transcript": result.get("history", ""),
            "debate_bull_history": result.get("bull_history", ""),
            "debate_bear_history": result.get("bear_history", ""),
            "investment_plan": result.get("investment_plan", ""),
            "conviction_adjustment": result.get("conviction_adjustment", 0.0),
        }
    except Exception as exc:
        logger.error("Debate sub-graph failed: %s", exc, exc_info=True)
        return {
            "debate_transcript": "",
            "debate_bull_history": "",
            "debate_bear_history": "",
            "investment_plan": "",
            "conviction_adjustment": 0.0,
        }


def _decision_node(state: AgentGraphState) -> dict:
    """Assemble analyst scores + debate adjustment into the final conviction result."""
    scores = state["scores"]
    components = ComponentScores(
        **{
            _COMPONENT_FIELD[key]: scores[key].score
            for key in ANALYST_ORDER
        }
    )

    # Compute base conviction via weighted formula
    result = ConvictionEngine().score(components)

    # Apply debate adjustment (Research Manager verdict shifts the score)
    adjustment = state.get("conviction_adjustment", 0.0)
    if adjustment != 0.0:
        adjusted_final = max(0.0, min(100.0, result.final + adjustment))
        logger.info(
            "Debate adjustment applied: %.1f (base: %.1f → adjusted: %.1f)",
            adjustment, result.final, adjusted_final,
        )
        result = result.model_copy(update={"final": round(adjusted_final, 2)})

    return {"component_scores": components, "conviction": result}


def build_graph(llm: LLMClient, grounding=None):
    """Compile the full analysis graph bound to the given LLM client.

    If ``grounding`` is provided, each analyst fetches real data and injects it
    into its prompt before scoring.
    """
    graph = StateGraph(AgentGraphState)

    # Add all 6 analyst nodes
    for key in ANALYST_ORDER:
        graph.add_node(
            key,
            _make_analyst(key, llm, ANALYST_PROMPTS[key], grounding),
        )

    # Add debate node (async, needs llm in closure)
    async def debate_node_bound(state):
        return await _debate_node(state, llm)

    graph.add_node("debate", debate_node_bound)
    graph.add_node("decision", _decision_node)

    # Wire: START → analysts (sequential) → debate → decision → END
    graph.add_edge(START, ANALYST_ORDER[0])
    for prev, nxt in zip(ANALYST_ORDER, ANALYST_ORDER[1:]):
        graph.add_edge(prev, nxt)
    graph.add_edge(ANALYST_ORDER[-1], "debate")
    graph.add_edge("debate", "decision")
    graph.add_edge("decision", END)

    return graph.compile()
