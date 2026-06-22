"""FastAPI application entrypoint for the Intelligence service."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.execution import router as execution_router
from app.api.v1.health import router as health_router
from app.api.v1.market import router as market_router
from app.api.v1.memory import router as memory_router
from app.api.v1.performance import router as performance_router
from app.api.v1.policies import router as policies_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.reports import router as reports_router
from app.api.v1.backtest import router as backtest_router
from app.api.v1.watchlist import router as watchlist_router
from app.core.config import get_settings
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )
    if settings.environment == "development":
        app.add_middleware(
            CORSMiddleware,
            allow_origin_regex="https?://.*",
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(recommendations_router, prefix="/api/v1")
    app.include_router(execution_router, prefix="/api/v1")
    app.include_router(policies_router, prefix="/api/v1")
    app.include_router(memory_router, prefix="/api/v1")
    app.include_router(performance_router, prefix="/api/v1")
    app.include_router(reports_router, prefix="/api/v1")
    app.include_router(watchlist_router, prefix="/api/v1")
    app.include_router(backtest_router, prefix="/api/v1")
    app.include_router(market_router, prefix="/api/v1")
    return app


app = create_app()
