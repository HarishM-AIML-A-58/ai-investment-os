"""Market intelligence endpoints.

GET /api/v1/market/regime   — NIFTY50 regime (bull/bear/sideways/high_vol)
GET /api/v1/market/fiidii   — 7-day FII/DII institutional flow with signal score
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.marketdata.regime import get_regime
from app.marketdata.fiidii import get_fiidii

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/regime")
async def regime_endpoint(force_refresh: bool = Query(default=False)):
    """Return the current NIFTY50 market regime.

    Cached 1 hour. Pass ``force_refresh=true`` to bypass cache.
    """
    return await get_regime(force_refresh=force_refresh)


@router.get("/fiidii")
async def fiidii_endpoint(force_refresh: bool = Query(default=False)):
    """Return 7-day FII/DII net flows and institutional signal score (0-100).

    Cached 1 hour. Pass ``force_refresh=true`` to bypass cache.
    """
    return await get_fiidii(force_refresh=force_refresh)
