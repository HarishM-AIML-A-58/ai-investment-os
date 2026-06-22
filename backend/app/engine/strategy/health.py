"""Long-term fundamental health and value-trap analysis."""

from __future__ import annotations

import json
import logging
from pydantic import BaseModel
from app.agents.llm.base import LLMClient

logger = logging.getLogger(__name__)


class HealthCheckResult(BaseModel):
    health_score: float
    is_value_trap: bool
    reasons: list[str]


class LongTermHealthScorer:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    async def analyze(
        self,
        symbol: str,
        quote: dict | None,
        news_block: str
    ) -> HealthCheckResult:
        pe = "N/A"
        sector_pe = "N/A"
        industry = "N/A"
        
        if quote and isinstance(quote, dict):
            meta = quote.get("metadata", {})
            info = quote.get("info", {})
            pe = meta.get("pdSymbolPe", "N/A")
            sector_pe = meta.get("pdSectorPe", "N/A")
            industry = info.get("industry") or meta.get("industry") or "N/A"

        system_prompt = (
            "You are an expert financial analyst AI. Your job is to analyze real company fundamentals and news to determine if the stock is a 'Value Trap' (a company that looks cheap but has failing business fundamentals, declining industry strength, or severe management issues) and evaluate its overall long-term corporate health.\n"
            "You must return ONLY a JSON object with the following schema:\n"
            "{\n"
            "  \"health_score\": float (from 0 to 100, where 100 is excellent health),\n"
            "  \"is_value_trap\": boolean (true if it has structural decay or red flags, false otherwise),\n"
            "  \"reasons\": [string] (list of 1-3 specific reasons for your rating based on the provided data)\n"
            "}\n"
            "Rules:\n"
            "- Negative P/E ratio means the company is losing money. This is a negative health indicator.\n"
            "- If P/E is significantly higher than Sector P/E (e.g. 2x or 3x higher), the stock may be extremely overvalued, which is high risk.\n"
            "- Do not hallucinate any information. Base your decision strictly on the provided fundamentals and recent headlines.\n"
            "- Return ONLY the raw JSON block without markdown formatting."
        )

        user_content = (
            f"Analyze stock: {symbol}\n"
            f"Industry: {industry}\n"
            f"P/E Ratio: {pe}\n"
            f"Sector P/E: {sector_pe}\n"
            f"Recent headlines:\n{news_block or 'No news available.'}"
        )

        try:
            resp = await self.llm.summarize(system=system_prompt, user=user_content)
            cleaned = resp.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            data = json.loads(cleaned)
            return HealthCheckResult(
                health_score=float(data.get("health_score", 50.0)),
                is_value_trap=bool(data.get("is_value_trap", False)),
                reasons=list(data.get("reasons", ["Analysis completed"]))
            )
        except Exception as e:
            logger.warning("Failed to parse LLM health scoring output: %s. Falling back to rule-based.", e)
            return self._fallback_rule_based(pe, sector_pe)

    def _fallback_rule_based(self, pe: str | float, sector_pe: str | float) -> HealthCheckResult:
        reasons = []
        health_score = 70.0
        is_value_trap = False

        try:
            val_pe = float(pe) if pe != "N/A" else None
            val_sec = float(sector_pe) if sector_pe != "N/A" else None
        except ValueError:
            val_pe = None
            val_sec = None

        if val_pe is not None:
            if val_pe < 0:
                health_score = 40.0
                is_value_trap = True
                reasons.append("Negative P/E ratio indicates negative earnings.")
            elif val_sec is not None and val_pe > 2.5 * val_sec:
                health_score = 50.0
                reasons.append("Premium valuation: P/E is 2.5x higher than sector average.")
            else:
                reasons.append("P/E ratio within historical industry boundaries.")
        else:
            reasons.append("Fundamentals quote unavailable; defaulted to neutral health rating.")

        return HealthCheckResult(
            health_score=health_score,
            is_value_trap=is_value_trap,
            reasons=reasons
        )
