"""Daily intelligence report generation.

Builds a structured report payload from recent recommendations. Market-overview
and portfolio-alert sections are scaffolded here and enriched once the live
gateway feeds are wired.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recommendation import Recommendation
from app.repositories.report_repo import upsert_report

VALID_TYPES = {"morning", "evening"}


async def generate_report(
    session: AsyncSession, *, report_date: date, report_type: str, top_n: int = 5
):
    if report_type not in VALID_TYPES:
        raise ValueError(f"report_type must be one of {sorted(VALID_TYPES)}")

    # Top opportunities = highest-conviction guard-passed recommendations.
    stmt = (
        select(Recommendation)
        .where(Recommendation.status == "guard_passed")
        .order_by(Recommendation.conviction.desc())
        .limit(top_n)
    )
    recs = list((await session.execute(stmt)).scalars().all())

    payload = {
        "type": report_type,
        "generated_for": report_date.isoformat(),
        "market_overview": {"note": "live market overview pending gateway wiring"},
        "top_opportunities": [
            {
                "recommendation_id": str(r.id),
                "action": r.action,
                "conviction": r.conviction,
                "band": r.band,
            }
            for r in recs
        ],
        "portfolio_alerts": [],
        "stocks_to_watch": [r.action for r in recs],
    }
    return await upsert_report(
        session, report_date=report_date, report_type=report_type, payload=payload
    )
