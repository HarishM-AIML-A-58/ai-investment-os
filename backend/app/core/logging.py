"""Logging configuration."""

from __future__ import annotations

import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    """Configure root logging to stdout (container-friendly)."""
    root = logging.getLogger()
    if root.handlers:  # idempotent — avoid duplicate handlers on reload
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s :: %(message)s")
    )
    root.addHandler(handler)
    root.setLevel(level)
