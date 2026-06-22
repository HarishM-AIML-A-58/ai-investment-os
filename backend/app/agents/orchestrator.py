"""Analysis orchestrator: run the graph, then persist the recommendation.

DB writes are kept out of the graph nodes (no async session threaded through
LangGraph state). The graph is pure compute; this orchestrator maps its output
onto ORM models and persists the full explainability trail — including the
bull/bear debate transcript and Research Manager investment plan.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import build_graph
from app.agents.llm.base import LLMClient
from app.agents.llm.models import ScoreOutput
from app.engine.conviction.models import ConvictionResult
from app.models.recommendation import (
    AgentScore,
    ConvictionBreakdown,
    Recommendation,
)
from app.repositories.recommendation_repo import create_recommendation


async def run_analysis(
    *,
    symbol: str,
    security_id: UUID,
    llm: LLMClient,
    session: AsyncSession,
    context: str = "",
    grounding=None,
) -> Recommendation:
    """Run the full analysis pipeline and persist the result.

    The pipeline:
    1. 6 deep analyst nodes (fundamental, technical, news, sector, institutional, risk)
    2. Bull/Bear debate sub-graph (N rounds → Research Manager verdict)
    3. ConvictionEngine (deterministic weighted formula + debate adjustment)
    4. Persist recommendation + full explainability trail to DB
    """
    graph = build_graph(llm, grounding=grounding)
    final = await graph.ainvoke({"symbol": symbol, "context": context})

    scores: dict[str, ScoreOutput] = final["scores"]
    result: ConvictionResult = final["conviction"]

    # Collect debate outputs (may be empty if debate node errored gracefully)
    debate_transcript: str = final.get("debate_transcript", "")
    investment_plan: str = final.get("investment_plan", "")
    conviction_adjustment: float = final.get("conviction_adjustment", 0.0)

    # Build thesis: per-agent rationale joined, then Research Manager plan appended
    per_agent_thesis = "; ".join(
        f"{agent}: {out.rationale}" for agent, out in scores.items()
    )
    thesis_parts = [per_agent_thesis]
    if investment_plan:
        thesis_parts.append(f"[Research Manager] {investment_plan}")
    if conviction_adjustment != 0.0:
        direction = "+" if conviction_adjustment > 0 else ""
        thesis_parts.append(
            f"[Debate Adjustment] {direction}{conviction_adjustment:.1f} points"
        )
    full_thesis = " | ".join(thesis_parts)

    recommendation = Recommendation(
        security_id=security_id,
        action=result.band.value,
        conviction=result.final,
        base_score=result.base,
        band=result.band.value,
        engine_version=result.engine_version,
        thesis=full_thesis,
        debate_transcript=debate_transcript,
        investment_plan=investment_plan,
        conviction_adjustment=conviction_adjustment,
        agent_scores=[
            AgentScore(
                agent=agent,
                score=out.score,
                rationale=out.rationale,
                report=out.report,
            )
            for agent, out in scores.items()
        ],
        conviction_breakdown=[
            ConvictionBreakdown(
                component=c.component,
                score=c.score,
                weight=c.weight,
                contribution=c.contribution,
            )
            for c in result.breakdown
        ],
    )
    return await create_recommendation(session, recommendation)
