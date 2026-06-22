"""Shared deterministic limit math.

Both the Policy Engine and the Trade Guard depend on these helpers so their
threshold calculations cannot drift apart. Currency uses :class:`Decimal`;
percentages are expressed on a 0-100 scale (e.g. ``20.0`` == 20%).
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal


def to_decimal(value: Decimal | int | float | str) -> Decimal:
    """Coerce to ``Decimal`` safely (via ``str`` to avoid float artefacts)."""
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def money(value: Decimal | int | float | str) -> Decimal:
    """Round a monetary amount to 2 decimal places (paise)."""
    return to_decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def pct_of(amount: Decimal, pct_0_100: float) -> Decimal:
    """Return ``pct`` percent of ``amount``. ``pct_0_100`` is on a 0-100 scale."""
    return to_decimal(amount) * (to_decimal(pct_0_100) / Decimal(100))
