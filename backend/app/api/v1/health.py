"""Health and readiness endpoints.

- ``/health``        : liveness — the process is up (no dependency checks).
- ``/health/ready``  : readiness — verifies PostgreSQL and Redis connectivity.
                       Returns 503 if any dependency is unreachable.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.core.config import get_settings
from app.db.redis import redis_client
from app.db.session import get_db
from app.schemas.health import ComponentStatus, HealthResponse, ReadinessResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", service=settings.app_name, version=__version__)


@router.get("/health/ready")
async def readiness(db: AsyncSession = Depends(get_db)) -> JSONResponse:
    components: dict[str, ComponentStatus] = {}
    healthy = True

    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar_one()
        components["database"] = ComponentStatus(status="ok")
    except Exception as exc:  # noqa: BLE001 - report any failure as degraded
        healthy = False
        logger.warning("readiness: database check failed: %s", exc)
        components["database"] = ComponentStatus(status="error", detail=str(exc))

    try:
        await redis_client.ping()
        components["redis"] = ComponentStatus(status="ok")
    except Exception as exc:  # noqa: BLE001
        healthy = False
        logger.warning("readiness: redis check failed: %s", exc)
        components["redis"] = ComponentStatus(status="error", detail=str(exc))

    payload = ReadinessResponse(
        status="ok" if healthy else "degraded",
        components=components,
    )
    return JSONResponse(
        status_code=200 if healthy else 503,
        content=payload.model_dump(),
    )
