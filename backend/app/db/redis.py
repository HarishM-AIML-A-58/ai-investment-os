"""Async Redis client (cache + Celery broker backbone later)."""

from __future__ import annotations

import redis.asyncio as aioredis

from app.core.config import get_settings

_settings = get_settings()

redis_client: aioredis.Redis = aioredis.from_url(
    _settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
)
