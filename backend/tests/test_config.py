"""Unit tests for settings — pure, no dependencies."""

from __future__ import annotations

from app.core.config import Settings


def test_database_url_is_async_asyncpg() -> None:
    s = Settings(
        postgres_user="u",
        postgres_password="p",
        postgres_host="h",
        postgres_port=5432,
        postgres_db="d",
    )
    assert s.database_url == "postgresql+asyncpg://u:p@h:5432/d"


def test_sync_database_url_uses_psycopg() -> None:
    s = Settings(
        postgres_user="u",
        postgres_password="p",
        postgres_host="h",
        postgres_port=5432,
        postgres_db="d",
    )
    assert s.sync_database_url == "postgresql+psycopg://u:p@h:5432/d"


def test_redis_url_built() -> None:
    s = Settings(redis_host="r", redis_port=6379, redis_db=1)
    assert s.redis_url == "redis://r:6379/1"
