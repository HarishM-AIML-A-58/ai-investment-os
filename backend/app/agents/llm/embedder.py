"""Embedding client interface with a deterministic stub and Azure implementation."""

from __future__ import annotations

import hashlib
from typing import Protocol

from app.models.memory import EMBEDDING_DIM


class Embedder(Protocol):
    async def embed(self, text: str) -> list[float]:
        """Return an embedding vector of length EMBEDDING_DIM."""
        ...


class StubEmbedder:
    """Deterministic, network-free embeddings derived from a content hash.

    Identical text yields identical vectors (distance 0), which is all the
    similarity-recall tests need.
    """

    def __init__(self, dim: int = EMBEDDING_DIM) -> None:
        self._dim = dim

    async def embed(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        base = [b / 255.0 for b in digest]  # 32 floats in [0, 1]
        return [base[i % len(base)] for i in range(self._dim)]


class AzureEmbedder:
    def __init__(self, client=None, deployment: str | None = None) -> None:
        from openai import AsyncAzureOpenAI

        from app.core.config import get_settings

        settings = get_settings()
        if client is None:
            if not (
                settings.azure_openai_endpoint
                and settings.azure_openai_api_key
                and settings.azure_openai_embedding_deployment
            ):
                raise RuntimeError("Azure OpenAI embeddings are not configured")
            client = AsyncAzureOpenAI(
                api_key=settings.azure_openai_api_key,
                azure_endpoint=settings.azure_openai_endpoint,
                api_version=settings.azure_openai_api_version,
            )
        self._client = client
        self._deployment = deployment or settings.azure_openai_embedding_deployment or ""

    async def embed(self, text: str) -> list[float]:
        resp = await self._client.embeddings.create(
            model=self._deployment, input=text
        )
        return list(resp.data[0].embedding)
