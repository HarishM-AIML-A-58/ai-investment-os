"""Azure OpenAI implementation of the LLM client.

The deployment name is config-driven (never hardcode the model). The client
requests a JSON object and parses it into a :class:`ScoreOutput`, clamping the
score to the valid range rather than failing on a slightly out-of-range value.

The ``score`` method now also extracts the optional ``report`` field that the
deep analyst prompts return alongside their numerical score and rationale.
"""

from __future__ import annotations

import json
import logging

from openai import AsyncAzureOpenAI, AsyncOpenAI

from app.agents.llm.models import ScoreOutput
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class AzureLLM:
    def __init__(self, client=None, deployment: str | None = None) -> None:
        settings = get_settings()
        if client is None:
            endpoint = settings.azure_openai_endpoint
            if not (
                endpoint
                and settings.azure_openai_api_key
                and settings.azure_openai_deployment
            ):
                raise RuntimeError("Azure OpenAI is not configured")
            if "/openai/v1" in endpoint:
                # Azure OpenAI v1 surface is OpenAI-compatible: use the plain
                # client with base_url + Bearer key (no /deployments path).
                base_url = endpoint if endpoint.endswith("/") else endpoint + "/"
                client = AsyncOpenAI(
                    api_key=settings.azure_openai_api_key, base_url=base_url
                )
            else:
                client = AsyncAzureOpenAI(
                    api_key=settings.azure_openai_api_key,
                    azure_endpoint=endpoint,
                    api_version=settings.azure_openai_api_version,
                )
        self._client = client
        self._deployment = deployment or settings.azure_openai_deployment or ""

    async def score(self, *, agent: str, system: str, user: str) -> ScoreOutput:
        """Call the LLM and parse the structured JSON response.

        The deep analyst prompts return:
          {"score": 0-100, "rationale": "...", "report": "## Full Markdown Report ..."}

        ``report`` is optional — older prompts without it still work (defaults to "").
        Score is clamped to [0, 100] regardless of what the model returns.
        """
        # No temperature override: the GPT-5 family accepts only the default.
        resp = await self._client.chat.completions.create(
            model=self._deployment,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or "{}"
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON for agent=%s; defaulting to 0", agent)
            data = {}

        raw = float(data.get("score", 0) or 0)
        score = max(0.0, min(100.0, raw))
        return ScoreOutput(
            score=score,
            rationale=str(data.get("rationale", "")),
            report=str(data.get("report", "")),
        )

    async def summarize(self, *, system: str, user: str) -> str:
        resp = await self._client.chat.completions.create(
            model=self._deployment,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return (resp.choices[0].message.content or "").strip()

    async def generate(self, *, system: str, user: str) -> str:
        """Free-text generation for debate agents.

        Unlike ``score``, this does not request JSON output — the debate agents
        produce conversational prose that is accumulated into the transcript.
        """
        resp = await self._client.chat.completions.create(
            model=self._deployment,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return (resp.choices[0].message.content or "").strip()
