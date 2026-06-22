"""Bull Researcher: advocates for buying the stock using analyst reports as evidence.

The bull researcher reads all 6 analyst reports and the bear's latest argument,
then builds a compelling evidence-based case for the long position. It debates
conversationally — directly rebutting bear points rather than listing data.
"""

from __future__ import annotations

import logging

from app.agents.llm.base import LLMClient

logger = logging.getLogger(__name__)

_BULL_SYSTEM = """\
You are the Bull Analyst for an Indian equity research team.
Your role: build the strongest possible case FOR investing in this stock.

Ground rules:
- Use ONLY the analyst reports provided — do not invent prices, earnings, or events.
- Engage directly with the bear's argument. Address each bear point specifically.
- Be conversational and persuasive, not a bullet-point list.
- Focus on: growth catalysts, competitive moat, institutional tailwinds, India macro upside.
- Cite specific data from the reports (P/E, growth rates, FII flows, technical levels).
- Challenge any bear assumptions that are overly conservative or outdated.

Your output will be read by the Research Manager judge. Make your argument count."""

_BULL_USER_TEMPLATE = """\
STOCK: {symbol}

ANALYST REPORTS SUMMARY:
{context}

COMPONENT SCORES:
{score_summary}

DEBATE HISTORY SO FAR:
{history}

BEAR ANALYST'S LAST ARGUMENT:
{bear_last}

Now make the BULL case. If this is the first round and there is no bear argument yet,
make your opening bull thesis directly from the analyst reports."""


async def bull_researcher_node(state: dict, llm: LLMClient) -> dict:
    """Execute one bull researcher turn."""
    reports = state.get("analyst_reports", {})
    scores = state.get("component_scores", {})
    history = state.get("history", "")
    bear_last = state.get("current_response", "")

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

    user = _BULL_USER_TEMPLATE.format(
        symbol=state.get("symbol", "UNKNOWN"),
        context=context,
        score_summary=score_summary,
        history=history if history else "No debate history yet — this is the opening argument.",
        bear_last=bear_last if bear_last else "No bear argument yet — open with your bull thesis.",
    )

    try:
        response = await llm.generate(system=_BULL_SYSTEM, user=user)
    except Exception as exc:
        logger.warning("Bull researcher LLM call failed: %s", exc)
        response = "Bull thesis: The analyst scores and data support a constructive position."

    argument = f"Bull Analyst: {response}"

    return {
        "history": (history + "\n\n" + argument).strip(),
        "bull_history": (state.get("bull_history", "") + "\n\n" + argument).strip(),
        "bear_history": state.get("bear_history", ""),
        "current_response": argument,
        "count": state.get("count", 0) + 1,
    }
