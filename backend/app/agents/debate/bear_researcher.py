"""Bear Researcher: makes the case AGAINST investing using analyst reports as evidence.

The bear researcher reads all 6 analyst reports and the bull's latest argument,
then builds a compelling risk-focused case against the long position. It debates
conversationally — directly rebutting bull points and exposing over-optimism.
"""

from __future__ import annotations

import logging

from app.agents.llm.base import LLMClient

logger = logging.getLogger(__name__)

_BEAR_SYSTEM = """\
You are the Bear Analyst for an Indian equity research team.
Your role: build the strongest possible case AGAINST investing in this stock.

Ground rules:
- Use ONLY the analyst reports provided — do not invent prices, earnings, or events.
- Engage directly with the bull's argument. Address each bull point specifically.
- Be conversational and persuasive, not a bullet-point list.
- Focus on: valuation risk, margin pressure, governance concerns, sector cycle late-stage,
  institutional distribution, India-specific red flags (pledging, SEBI, related parties).
- Cite specific data from the reports (P/E vs peers, D/E ratio, FII outflows, risk flags).
- Challenge any bull assumptions that are over-optimistic or not data-backed.

Your output will be read by the Research Manager judge. Make your argument count."""

_BEAR_USER_TEMPLATE = """\
STOCK: {symbol}

ANALYST REPORTS SUMMARY:
{context}

COMPONENT SCORES:
{score_summary}

DEBATE HISTORY SO FAR:
{history}

BULL ANALYST'S LAST ARGUMENT:
{bull_last}

Now make the BEAR case. If this is the first round and there is no bull argument yet,
make your opening bear thesis directly from the analyst reports."""


async def bear_researcher_node(state: dict, llm: LLMClient) -> dict:
    """Execute one bear researcher turn."""
    reports = state.get("analyst_reports", {})
    scores = state.get("component_scores", {})
    history = state.get("history", "")
    bull_last = state.get("current_response", "")

    # Format analyst reports as a readable block
    context = "\n\n".join(
        f"**{name.upper()} ANALYST** (score: {scores.get(name, 'N/A')}/100):\n{report[:800]}..."
        if len(report) > 800 else
        f"**{name.upper()} ANALYST** (score: {scores.get(name, 'N/A')}/100):\n{report}"
        for name, report in reports.items()
        if report.strip()
    ) or "No analyst reports available."

    score_summary = " | ".join(
        f"{k}: {v:.0f}" for k, v in scores.items()
    ) or "No scores available."

    user = _BEAR_USER_TEMPLATE.format(
        symbol=state.get("symbol", "UNKNOWN"),
        context=context,
        score_summary=score_summary,
        history=history if history else "No debate history yet — this is the opening argument.",
        bull_last=bull_last if bull_last else "No bull argument yet — open with your bear thesis.",
    )

    try:
        response = await llm.generate(system=_BEAR_SYSTEM, user=user)
    except Exception as exc:
        logger.warning("Bear researcher LLM call failed: %s", exc)
        response = "Bear thesis: Risk factors and valuation concerns warrant caution at current levels."

    argument = f"Bear Analyst: {response}"

    return {
        "history": (history + "\n\n" + argument).strip(),
        "bear_history": (state.get("bear_history", "") + "\n\n" + argument).strip(),
        "bull_history": state.get("bull_history", ""),
        "current_response": argument,
        "count": state.get("count", 0) + 1,
    }
