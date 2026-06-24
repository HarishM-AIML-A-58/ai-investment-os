import asyncio
import logging
import shlex
from typing import Any, Dict, List, Optional
from contextlib import AsyncExitStack

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class McpManager:
    def __init__(self) -> None:
        self._session: Optional[ClientSession] = None
        self._exit_stack: Optional[AsyncExitStack] = None
        self._lock = asyncio.Lock()
        self._tools: List[Any] = []

    async def get_session(self) -> ClientSession:
        async with self._lock:
            if self._session is not None:
                return self._session

            settings = get_settings()
            cmd = settings.groww_mcp_command
            args = shlex.split(settings.groww_mcp_args)

            logger.info("Spawning Groww MCP server using: %s %s", cmd, " ".join(args))
            server_params = StdioServerParameters(
                command=cmd,
                args=args,
                env=None
            )

            self._exit_stack = AsyncExitStack()
            try:
                read_stream, write_stream = await self._exit_stack.enter_async_context(
                    stdio_client(server_params)
                )
                session = await self._exit_stack.enter_async_context(
                    ClientSession(read_stream, write_stream)
                )
                await session.initialize()
                self._session = session

                # Cache tools list
                tools_response = await session.list_tools()
                self._tools = tools_response.tools
                logger.info("Successfully connected to Groww MCP. Available tools: %s", 
                            [t.name for t in self._tools])
                return self._session
            except Exception as exc:
                logger.error("Failed to connect to Groww MCP server: %s", exc)
                await self.close()
                raise exc

    async def close(self) -> None:
        if self._exit_stack is not None:
            try:
                await self._exit_stack.aclose()
            except Exception as exc:
                logger.warning("Error closing MCP connection: %s", exc)
        self._session = None
        self._exit_stack = None
        self._tools = []

    async def _resolve_tool_name(self, keywords: List[str], default_name: str) -> str:
        """Dynamically resolve tool name by matching keywords."""
        session = await self.get_session()
        for t in self._tools:
            name_lower = t.name.lower()
            if any(k in name_lower for k in keywords):
                return t.name
        return default_name

    async def call_mcp_tool(self, keywords: List[str], default_name: str, arguments: Dict[str, Any]) -> Any:
        try:
            session = await self.get_session()
            tool_name = await self._resolve_tool_name(keywords, default_name)
            logger.info("Invoking MCP tool %s with arguments %s", tool_name, arguments)
            result = await session.call_tool(tool_name, arguments)
            return result
        except Exception as exc:
            logger.error("Error executing MCP tool for keywords %s: %s", keywords, exc)
            # Reset session on failure to force reconnection next time
            await self.close()
            raise exc

    async def fetch_holdings(self) -> List[Dict[str, Any]]:
        """Fetch stock and mutual fund holdings."""
        res = await self.call_mcp_tool(["holding", "portfolio"], "get_holdings", {})
        # MCP call returns a response with content field
        if hasattr(res, "content") and res.content:
            import json
            try:
                # Often it returns json text, or structural data
                text = res.content[0].text
                return json.loads(text)
            except Exception:
                return [{"raw": str(res.content)}]
        return []

    async def fetch_funds(self) -> Dict[str, Any]:
        """Fetch available margin and cash balances."""
        res = await self.call_mcp_tool(["fund", "balance", "margin", "capital"], "get_funds", {})
        if hasattr(res, "content") and res.content:
            import json
            try:
                text = res.content[0].text
                return json.loads(text)
            except Exception:
                return {"raw": str(res.content)}
        return {}

    async def fetch_quote(self, symbol: str, exchange: str = "NSE") -> Dict[str, Any]:
        """Fetch real-time stock/index quote."""
        args = {"symbol": symbol, "exchange": exchange}
        res = await self.call_mcp_tool(["quote", "price", "ltp"], "get_quote", args)
        if hasattr(res, "content") and res.content:
            import json
            try:
                text = res.content[0].text
                return json.loads(text)
            except Exception:
                return {"raw": str(res.content)}
        return {}

    async def fetch_history(self, symbol: str, exchange: str = "NSE", days: int = 250) -> List[Dict[str, Any]]:
        """Fetch daily OHLCV candles."""
        args = {"symbol": symbol, "exchange": exchange, "days": days, "interval": "day"}
        res = await self.call_mcp_tool(["history", "candle", "ohlcv"], "get_history", args)
        if hasattr(res, "content") and res.content:
            import json
            try:
                text = res.content[0].text
                return json.loads(text)
            except Exception:
                # If it's a structural list or string representation
                text = res.content[0].text
                if text.strip().startswith("["):
                    return json.loads(text)
                return []
        return []

# Singleton instance
_mcp_manager = McpManager()

def get_mcp_manager() -> McpManager:
    return _mcp_manager
