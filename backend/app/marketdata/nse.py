"""NSE India official data client (free, authentic exchange data).

NSE has no stable public API: requests need browser-like headers and a primed
cookie session, and are rate-limited. This client primes once, sets headers, and
fails soft (callers degrade gracefully rather than fabricating data).
"""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

NSE_BASE = "https://www.nseindia.com"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}


class NseData:
    def __init__(self, client: httpx.AsyncClient | None = None, timeout: float = 10.0) -> None:
        self._owns = client is None
        self._client = client or httpx.AsyncClient(
            base_url=NSE_BASE, headers=_HEADERS, timeout=timeout
        )
        self._primed = False

    async def aclose(self) -> None:
        if self._owns:
            await self._client.aclose()

    async def __aenter__(self) -> "NseData":
        return self

    async def __aexit__(self, *_) -> None:
        await self.aclose()

    async def _prime(self) -> None:
        """Hit the homepage once to obtain the session cookies NSE requires."""
        if self._primed:
            return
        try:
            await self._client.get("/")
        except httpx.HTTPError as exc:  # noqa: BLE001
            logger.warning("nse prime failed: %s", exc)
        self._primed = True

    async def _get_json(self, path: str, params: dict | None = None) -> dict | list | None:
        await self._prime()
        try:
            resp = await self._client.get(path, params=params)
            if resp.status_code != 200:
                logger.warning("nse %s -> %s", path, resp.status_code)
                return None
            return resp.json()
        except (httpx.HTTPError, ValueError) as exc:  # noqa: BLE001
            logger.warning("nse %s failed: %s", path, exc)
            return None

    async def fii_dii(self) -> list[dict]:
        """Daily FII/DII cash-market activity."""
        data = await self._get_json("/api/fiidiiTradeReact")
        return data if isinstance(data, list) else []

    async def equity_quote(self, symbol: str) -> dict | None:
        """Equity quote incl. P/E metadata (a real fundamentals figure)."""
        return await self._get_json("/api/quote-equity", params={"symbol": symbol})  # type: ignore[return-value]

    async def bulk_deals(self) -> list[dict]:
        data = await self._get_json(
            "/api/historicalOR/bulk-block-short-deals", params={"optionType": "bulk_deals"}
        )
        if isinstance(data, dict):
            return data.get("data", [])
        return data if isinstance(data, list) else []
