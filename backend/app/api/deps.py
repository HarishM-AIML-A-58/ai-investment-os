"""Shared FastAPI dependencies.

Each returns a production implementation and is overridden in tests via
``app.dependency_overrides`` with deterministic stubs/fakes.
"""

from __future__ import annotations

from app.agents.llm.azure import AzureLLM
from app.agents.llm.base import LLMClient
from app.agents.llm.embedder import AzureEmbedder, Embedder
from app.core.config import get_settings
from app.gateway import GatewayClient


def get_llm() -> LLMClient:
    return AzureLLM()


def get_embedder() -> Embedder | None:
    """Return an embedder, or None when embeddings are not configured."""
    settings = get_settings()
    if not (
        settings.azure_openai_endpoint
        and settings.azure_openai_api_key
        and settings.azure_openai_embedding_deployment
    ):
        return None
    return AzureEmbedder()


def get_gateway() -> GatewayClient:
    return GatewayClient()


def get_grounding():
    """Live data grounding (Groww gateway + NSE official + RSS news).

    Returns None when disabled, so the agents fall back to ungrounded reasoning.
    """
    from app.core.config import get_settings
    from app.marketdata.grounding import LiveGrounding
    from app.marketdata.news import RssNews
    from app.marketdata.nse import NseData

    if not get_settings().grounding_enabled:
        return None
    return LiveGrounding(gateway=GatewayClient(), nse=NseData(), news=RssNews())
