"""Structured LLM output."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ScoreOutput(BaseModel):
    """An analyst agent's structured verdict: a 0-100 score plus rationale and full report."""

    score: float = Field(ge=0, le=100)
    rationale: str = ""
    report: str = ""  # Full markdown report from the analyst agent
