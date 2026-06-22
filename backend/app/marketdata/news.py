"""RSS news client for Indian financial outlets (free, authentic headlines)."""

from __future__ import annotations

import logging
from xml.etree import ElementTree as ET

import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

DEFAULT_FEEDS = [
    "https://www.moneycontrol.com/rss/marketreports.xml",
    "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "https://www.livemint.com/rss/markets",
]


class Headline(BaseModel):
    title: str
    link: str
    published: str
    source: str


class RssNews:
    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        feeds: list[str] | None = None,
        timeout: float = 10.0,
    ) -> None:
        self._owns = client is None
        self._client = client or httpx.AsyncClient(timeout=timeout)
        self._feeds = feeds or DEFAULT_FEEDS

    async def aclose(self) -> None:
        if self._owns:
            await self._client.aclose()

    @staticmethod
    def _parse(xml_text: str, source: str) -> list[Headline]:
        out: list[Headline] = []
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            return out
        for item in root.iter("item"):
            title = item.findtext("title") or ""
            link = item.findtext("link") or ""
            pub = item.findtext("pubDate") or ""
            if title:
                out.append(
                    Headline(title=title.strip(), link=link.strip(), published=pub.strip(), source=source)
                )
        return out

    async def fetch_headlines(
        self, query: str | None = None, limit: int = 10
    ) -> list[Headline]:
        collected: list[Headline] = []
        for feed in self._feeds:
            try:
                resp = await self._client.get(feed)
                if resp.status_code != 200:
                    continue
                collected.extend(self._parse(resp.text, feed))
            except httpx.HTTPError as exc:  # noqa: BLE001
                logger.warning("rss fetch failed (%s): %s", feed, exc)

        if query:
            q = query.lower()
            collected = [h for h in collected if q in h.title.lower()]
        return collected[:limit]
