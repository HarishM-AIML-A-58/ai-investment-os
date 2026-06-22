"""LLM client interface.

Agents depend on this Protocol, not a concrete provider, so the graph runs with
a deterministic stub in tests and Azure OpenAI in production.
"""

from __future__ import annotations

from typing import Protocol

from app.agents.llm.models import ScoreOutput


class LLMClient(Protocol):
    async def score(self, *, agent: str, system: str, user: str) -> ScoreOutput:
        """Return a structured 0-100 score with rationale and full report for one analyst."""
        ...

    async def summarize(self, *, system: str, user: str) -> str:
        """Generate a single-sentence dynamic text summary/rationale."""
        ...

    async def generate(self, *, system: str, user: str) -> str:
        """Free-text generation — used by debate agents (bull/bear/manager)."""
        ...
