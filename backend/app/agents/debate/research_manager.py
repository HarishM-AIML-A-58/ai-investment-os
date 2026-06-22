"""Research Manager: reads the full bull/bear debate transcript and delivers a verdict.

The Research Manager acts as the impartial judge who:
1. Evaluates which side made stronger, more data-grounded arguments
2. Produces a structured investment plan (3-sentence summary)
3. Outputs a conviction_adjustment (-20 to +20) to shift the base conviction score

The adjustment is conservative by design — only moves the needle materially when
the debate evidence is strongly one-sided.
"""

from __future__ import annotations

import json
import logging

from app.agents.llm.base import LLMClient

logger = logging.getLogger(__name__)

_MANAGER_SYSTEM = """\
You are the Research Manager and debate judge for an Indian equity research team.

Your role: read the full bull/bear debate and deliver a structured verdict.

RATING SCALE (use exactly one):
- Strong Bull Win: Bull made decisive, data-backed arguments; bear was largely rebutted
- Moderate Bull Win: Bull had the stronger case overall
- Balanced: Both sides made valid points; evidence is genuinely mixed
- Moderate Bear Win: Bear had the stronger case overall
- Strong Bear Win: Bear made decisive risk arguments; bull was largely rebutted

CONVICTION ADJUSTMENT GUIDE:
- Strong Bull Win → +15 to +20
- Moderate Bull Win → +5 to +14
- Balanced → -4 to +4
- Moderate Bear Win → -5 to -14
- Strong Bear Win → -15 to -20

INVESTMENT PLAN: Write 3 sentences covering:
1. Overall verdict and rating
2. Primary driver of your decision (cite specific analyst data)
3. Key condition to watch that could change the verdict

Respond ONLY with valid JSON (no markdown fences):
{
  "verdict": "Strong Bull Win|Moderate Bull Win|Balanced|Moderate Bear Win|Strong Bear Win",
  "conviction_adjustment": <integer -20 to 20>,
  "investment_plan": "<3 sentence plan>",
  "rationale": "<1 sentence on what decided the debate>"
}"""

_MANAGER_USER_TEMPLATE = """\
STOCK: {symbol}

COMPONENT SCORES (before debate adjustment):
{score_summary}

FULL DEBATE TRANSCRIPT:
{history}

Deliver your verdict and conviction adjustment."""


async def research_manager_node(state: dict, llm: LLMClient) -> dict:
    """Research Manager synthesises the debate into a verdict and conviction adjustment."""
    history = state.get("history", "")
    scores = state.get("component_scores", {})

    score_summary = " | ".join(
        f"{k}: {v:.0f}/100" for k, v in scores.items()
    ) or "No scores available."

    user = _MANAGER_USER_TEMPLATE.format(
        symbol=state.get("symbol", "UNKNOWN"),
        score_summary=score_summary,
        history=history if history else "No debate occurred.",
    )

    try:
        response = await llm.generate(system=_MANAGER_SYSTEM, user=user)
        # Strip markdown fences if model adds them despite instructions
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        data = json.loads(clean)
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("Research Manager parse error: %s", exc)
        data = {
            "verdict": "Balanced",
            "conviction_adjustment": 0,
            "investment_plan": "The debate was inconclusive. Maintain base conviction score.",
            "rationale": "Parse error — defaulting to balanced verdict.",
        }

    adjustment = float(data.get("conviction_adjustment", 0))
    # Clamp to valid range
    adjustment = max(-20.0, min(20.0, adjustment))

    investment_plan = data.get("investment_plan", "")

    return {
        "judge_decision": investment_plan,
        "investment_plan": investment_plan,
        "conviction_adjustment": adjustment,
        "history": state.get("history", ""),
        "bull_history": state.get("bull_history", ""),
        "bear_history": state.get("bear_history", ""),
        "current_response": investment_plan,
        "count": state.get("count", 0),
    }
