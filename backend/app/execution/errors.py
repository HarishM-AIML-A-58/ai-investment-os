"""Execution Service error hierarchy."""

from __future__ import annotations


class ExecutionError(Exception):
    """Base error for execution failures."""


class GuardNotPassedError(ExecutionError):
    """Refused: the Trade Guard did not pass. Money authority denied."""


class ExecutionRejectedError(ExecutionError):
    """The gateway preview rejected the order before placement."""


class DuplicateOrderError(ExecutionError):
    """An order with the same idempotency key was already placed."""
