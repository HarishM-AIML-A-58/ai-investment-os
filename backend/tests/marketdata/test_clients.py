"""NSE and RSS client tests using httpx MockTransport (no real network)."""

from __future__ import annotations

import httpx

from app.marketdata.news import RssNews
from app.marketdata.nse import NseData

SAMPLE_RSS = """<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>TCS wins large deal in Europe</title><link>http://x/1</link><pubDate>Tue, 17 Jun 2026</pubDate></item>
  <item><title>Market roundup: Nifty flat</title><link>http://x/2</link><pubDate>Tue, 17 Jun 2026</pubDate></item>
</channel></rss>"""

FII_DII_JSON = [
    {"category": "FII/FPI", "buyValue": "12000", "sellValue": "11000", "netValue": "1000"},
    {"category": "DII", "buyValue": "8000", "sellValue": "7000", "netValue": "1000"},
]


async def test_rss_parses_and_filters() -> None:
    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda r: httpx.Response(200, text=SAMPLE_RSS))
    )
    news = RssNews(client=client, feeds=["http://feed"])
    all_hl = await news.fetch_headlines(limit=10)
    assert len(all_hl) == 2
    tcs = await news.fetch_headlines(query="tcs", limit=10)
    assert len(tcs) == 1
    assert "TCS" in tcs[0].title
    await news.aclose()


async def test_nse_fii_dii_primes_and_parses() -> None:
    calls = {"prime": 0, "api": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/":
            calls["prime"] += 1
            return httpx.Response(200, text="ok")
        if request.url.path == "/api/fiidiiTradeReact":
            calls["api"] += 1
            return httpx.Response(200, json=FII_DII_JSON)
        return httpx.Response(404)

    client = httpx.AsyncClient(
        base_url="https://www.nseindia.com", transport=httpx.MockTransport(handler)
    )
    nse = NseData(client=client)
    rows = await nse.fii_dii()
    assert calls["prime"] == 1  # session primed once
    assert calls["api"] == 1
    assert rows[0]["category"] == "FII/FPI"
    await nse.aclose()


async def test_nse_failure_degrades_to_empty() -> None:
    client = httpx.AsyncClient(
        base_url="https://www.nseindia.com",
        transport=httpx.MockTransport(lambda r: httpx.Response(503)),
    )
    nse = NseData(client=client)
    assert await nse.fii_dii() == []  # graceful degradation, no exception
    await nse.aclose()
