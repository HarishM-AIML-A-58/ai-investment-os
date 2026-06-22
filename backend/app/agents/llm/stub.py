"""Deterministic stub LLM for tests and offline development."""

from __future__ import annotations

from app.agents.llm.models import ScoreOutput

_STUB_REPORTS: dict[str, str] = {
    "fundamental": "## Fundamental Analysis\n\n**Stub report** — replace with live data in production.\n\n| Metric | Value |\n|---|---|\n| P/E | 22x |\n| ROE | 18% |\n| D/E | 0.4 |",
    "technical": "## Technical Analysis\n\n**Stub report** — replace with live data in production.\n\n| Indicator | Signal |\n|---|---|\n| RSI(14) | 58 — neutral |\n| MACD | Bullish crossover |\n| Price vs 200 EMA | Above |",
    "news": "## News Intelligence\n\n**Stub report** — no live news in test mode.\n\n| Item | Impact |\n|---|---|\n| Q4 results | Positive — beat estimates |\n| RBI policy | Neutral |",
    "sector": "## Sector Rotation\n\n**Stub report** — sector data not available in test mode.",
    "institutional": "## Institutional Flow\n\n**Stub report** — FII/DII data not available in test mode.",
    "risk": "## Risk Assessment\n\n**Stub report** — risk metrics not available in test mode.\n\n| Risk | Level |\n|---|---|\n| Beta | 1.1 |\n| Volatility | Medium |",
}


class StubLLM:
    """Returns canned, per-agent scores. No network, fully deterministic."""

    def __init__(
        self, scores: dict[str, float] | None = None, default: float = 75.0
    ) -> None:
        self._scores = scores or {}
        self._default = default

    async def score(self, *, agent: str, system: str, user: str) -> ScoreOutput:
        value = self._scores.get(agent, self._default)
        return ScoreOutput(
            score=value,
            rationale=f"stub rationale for {agent}",
            report=_STUB_REPORTS.get(agent, f"## {agent.title()} Report\n\nStub report."),
        )

    async def summarize(self, *, system: str, user: str) -> str:
        status = "Accepted"
        if "blocked" in user.lower() or "blocked" in system.lower():
            status = "Blocked"

        symbol = "Asset"
        for line in user.splitlines():
            if line.strip().startswith("Asset:"):
                symbol = line.split(":", 1)[1].strip()
                break
        return f"{status}: Dynamic AI stub summary for {symbol}."

    async def generate(self, *, system: str, user: str) -> str:
        """Stub free-text generation for debate agents."""
        if "bull" in system.lower():
            return "The fundamentals and technical momentum strongly support a bullish position. Growth catalysts are intact and institutional flows confirm accumulation."
        if "bear" in system.lower():
            return "Valuation looks stretched relative to peers and the risk/reward is unfavorable at current levels. Caution is warranted."
        return "Balanced view: the evidence is mixed. Recommend monitoring closely before taking a position."
