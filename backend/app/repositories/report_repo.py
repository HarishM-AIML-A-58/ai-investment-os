"""Report persistence."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import Report


async def get_report(
    session: AsyncSession, *, report_date: date, report_type: str
) -> Report | None:
    stmt = select(Report).where(
        Report.report_date == report_date, Report.report_type == report_type
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def upsert_report(
    session: AsyncSession, *, report_date: date, report_type: str, payload: dict
) -> Report:
    report = await get_report(
        session, report_date=report_date, report_type=report_type
    )
    if report is None:
        report = Report(
            report_date=report_date, report_type=report_type, payload=payload
        )
        session.add(report)
    else:
        report.payload = payload
    await session.commit()
    await session.refresh(report)
    return report
