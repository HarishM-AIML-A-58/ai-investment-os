"""Application configuration.

All settings are environment-driven (12-factor). Defaults target the Docker
Compose network (service hostnames ``postgres`` / ``redis`` / ``gateway``).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "AI Investment OS"
    environment: str = "development"
    debug: bool = True

    # --- PostgreSQL ---
    postgres_user: str = "aios"
    postgres_password: str = "aios"
    postgres_db: str = "aios"
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    # --- Redis ---
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0

    # --- Broker & Market-Data Gateway (openalgo) ---
    gateway_url: str = "http://gateway:5000"

    # --- Azure OpenAI (deployment name is config-driven, never hardcoded) ---
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment: str | None = None
    azure_openai_embedding_deployment: str | None = None
    azure_openai_api_version: str = "2024-10-21"

    # --- Single-user bootstrap ---
    owner_email: str = "owner@local"

    # --- Live data grounding (Groww + NSE + RSS) ---
    grounding_enabled: bool = True

    # --- CORS (frontend origins) ---
    cors_allow_origins: str = "http://localhost:5000,http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]

    @property
    def celery_broker_url(self) -> str:
        return self.redis_url

    @property
    def celery_result_backend(self) -> str:
        return self.redis_url

    @property
    def database_url(self) -> str:
        """Async SQLAlchemy URL (asyncpg driver)."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def sync_database_url(self) -> str:
        """Sync URL for Alembic migrations (psycopg/asyncpg-free path)."""
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor (single instance per process)."""
    return Settings()
