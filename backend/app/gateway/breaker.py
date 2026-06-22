"""A minimal in-memory circuit breaker for gateway calls."""

from __future__ import annotations

from time import monotonic


class CircuitBreaker:
    """Opens after ``fail_max`` consecutive failures; half-opens after cooldown.

    A successful call resets the failure count. While open, callers should
    short-circuit rather than hammering an unhealthy gateway.
    """

    def __init__(self, fail_max: int = 5, reset_timeout: float = 30.0) -> None:
        self.fail_max = fail_max
        self.reset_timeout = reset_timeout
        self._failures = 0
        self._opened_at: float | None = None

    @property
    def is_open(self) -> bool:
        if self._opened_at is None:
            return False
        if monotonic() - self._opened_at >= self.reset_timeout:
            # Cooldown elapsed → allow a trial call (half-open).
            return False
        return True

    def record_success(self) -> None:
        self._failures = 0
        self._opened_at = None

    def record_failure(self) -> None:
        self._failures += 1
        if self._failures >= self.fail_max:
            self._opened_at = monotonic()
