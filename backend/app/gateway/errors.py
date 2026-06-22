"""Gateway client error hierarchy."""

from __future__ import annotations


class GatewayError(Exception):
    """Base error for any broker-gateway failure."""


class GatewayTimeout(GatewayError):
    """The gateway did not respond within the timeout."""


class GatewayUnavailable(GatewayError):
    """The circuit breaker is open — calls are short-circuited."""
