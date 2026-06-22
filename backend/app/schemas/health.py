"""Health/readiness response schemas."""

from __future__ import annotations

from pydantic import BaseModel


class ComponentStatus(BaseModel):
    status: str  # "ok" | "error"
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ReadinessResponse(BaseModel):
    status: str  # "ok" | "degraded"
    components: dict[str, ComponentStatus]
