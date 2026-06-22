"""Daily intelligence reports API."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.reports import generate_report
from app.repositories.report_repo import get_report

router = APIRouter(prefix="/reports", tags=["reports"])


class GenerateBody(BaseModel):
    report_date: date
    report_type: str  # morning | evening


class ReportOut(BaseModel):
    report_date: date
    report_type: str
    payload: dict


@router.post("/generate", response_model=ReportOut)
async def generate(body: GenerateBody, db: AsyncSession = Depends(get_db)) -> ReportOut:
    try:
        report = await generate_report(
            db, report_date=body.report_date, report_type=body.report_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ReportOut(
        report_date=report.report_date,
        report_type=report.report_type,
        payload=report.payload,
    )


@router.get("/{report_date}/{report_type}", response_model=ReportOut)
async def read_report(
    report_date: date, report_type: str, db: AsyncSession = Depends(get_db)
) -> ReportOut:
    report = await get_report(db, report_date=report_date, report_type=report_type)
    if report is None:
        raise HTTPException(status_code=404, detail="report not found")
    return ReportOut(
        report_date=report.report_date,
        report_type=report.report_type,
        payload=report.payload,
    )
