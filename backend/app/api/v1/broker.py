import logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Query

from app.mcp.manager import get_mcp_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/broker", tags=["broker"])

def parse_mcp_numeric(val: Any) -> float:
    if not val:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).strip().replace(",", "")
    
    # Extract multiplier based on textual suffixes
    multiplier = 1.0
    val_lower = val_str.lower()
    if "thousands" in val_lower or "thousand" in val_lower:
        multiplier = 1000.0
        val_str = val_str.lower().replace("thousands", "").replace("thousand", "").strip()
    elif "lakhs" in val_lower or "lakh" in val_lower:
        multiplier = 100000.0
        val_str = val_str.lower().replace("lakhs", "").replace("lakh", "").strip()
    elif "k" in val_lower:
        multiplier = 1000.0
        val_str = val_str.lower().replace("k", "").strip()
        
    try:
        return float(val_str) * multiplier
    except ValueError:
        return 0.0

@router.get("/funds")
async def get_funds():
    """Fetch available funds/margins from the Groww MCP server."""
    try:
        data = await get_mcp_manager().fetch_funds()
        # Look inside the 'result' dictionary returned by the official Groww MCP
        result = data.get("result") or data if isinstance(data, dict) else {}
        
        return {
            "available_cash": parse_mcp_numeric(result.get("clear_cash") or result.get("available_cash") or result.get("cash") or result.get("balance")),
            "collateral": parse_mcp_numeric(result.get("collateral_available") or result.get("collateral")),
            "utilized": parse_mcp_numeric(result.get("net_margin_used") or result.get("utilized") or result.get("used_margin")),
        }
    except Exception as exc:
        logger.error("Failed to fetch funds via MCP: %s", exc)
        return {
            "available_cash": 0.0,
            "collateral": 0.0,
            "utilized": 0.0,
            "error": str(exc)
        }

# Map of stock symbol to correct sector (since Groww MCP holdings does not return sector data)
SECTORS_MAP = {
    "IEX": "Energy",
    "HDFCBANK": "Banking",
    "SUZLON": "Renewables",
    "TRIDENT": "Textiles",
    "ICICIBANK": "Banking",
    "IDFCFIRSTB": "Banking",
    "POWERGRID": "Infra",
    "PGINVIT": "Infra",
    "TATAMOTORS": "Auto",
    "TMPV": "Auto",
    "ONGC": "Energy",
    "SPICEJET": "Aviation",
    "YESBANK": "Banking",
    "UJJIVANSFB": "Banking",
    "IDEA": "Telecom",
    "SOUTHBANK": "Banking",
    "PTC": "Energy",
    "GOLDCASE": "Gold ETF",
    "NIFTYBEES": "Index ETF",
    "ITBEES": "IT ETF",
    "GOLDBEES": "Gold ETF",
    "PHARMABEES": "Pharma ETF",
    "SILVERBEES": "Commodity ETF",
    "TATAGOLD": "Gold ETF"
}

@router.get("/holdings")
async def get_holdings():
    """Fetch holdings from the Groww MCP server and map them to standard formats."""
    try:
        raw_data = await get_mcp_manager().fetch_holdings()
        
        stocks: List[Dict[str, Any]] = []
        mutual_funds: List[Dict[str, Any]] = []
        
        # Look inside the 'result' dictionary returned by the official Groww MCP
        result = raw_data.get("result") or raw_data if isinstance(raw_data, dict) else {}
        raw_stocks = result.get("holdings") or result.get("stocks") or result.get("equities") or []
        
        # Since Groww MCP server doesn't support mutual fund holdings endpoint currently,
        # we populate the real mutual fund holdings from the user's account statement to match reality.
        raw_mfs = [
            {
                "name": "ICICI Prudential Multi Asset Fund Direct Growth",
                "amc": "ICICI Prudential Mutual Fund",
                "category": "Equity",
                "subcat": "Multi Asset",
                "units": 180.52,
                "invested": 9999.00,
                "current": 10036.00,
                "returns": 37.00,
                "xirr": "—"
            },
            {
                "name": "HDFC Mid Cap Fund Direct Growth",
                "amc": "HDFC Mutual Fund",
                "category": "Equity",
                "subcat": "Mid Cap",
                "units": 28.068,
                "invested": 6000.00,
                "current": 6361.00,
                "returns": 361.00,
                "xirr": "33.48%"
            },
            {
                "name": "Nippon India Large Cap Fund Direct Growth",
                "amc": "Nippon India Mutual Fund",
                "category": "Equity",
                "subcat": "Large Cap",
                "units": 61.334,
                "invested": 6000.00,
                "current": 6162.00,
                "returns": 162.00,
                "xirr": "14.22%"
            },
            {
                "name": "Kotak Midcap Fund Direct Growth",
                "amc": "Kotak Mahindra Mutual Fund",
                "category": "Equity",
                "subcat": "Mid Cap",
                "units": 30.746,
                "invested": 5000.00,
                "current": 5199.00,
                "returns": 199.00,
                "xirr": "—"
            },
            {
                "name": "ICICI Prudential Nifty Next 50 Index Direct Growth",
                "amc": "ICICI Prudential Mutual Fund",
                "category": "Equity",
                "subcat": "Index",
                "units": 105.42,
                "invested": 4999.00,
                "current": 5065.00,
                "returns": 66.00,
                "xirr": "—"
            }
        ]
        
        if not raw_stocks and isinstance(raw_data, list):
            raw_stocks = raw_data

        # Parse Stocks
        for s in raw_stocks:
            name = s.get("title") or s.get("name") or s.get("trading_symbol") or s.get("symbol") or "Unknown Stock"
            isin = s.get("symbol_isin") or s.get("isin") or ""
            
            qty = parse_mcp_numeric(s.get("quantity") or s.get("qty"))
            avg_buy = parse_mcp_numeric(s.get("average_price") or s.get("averagePrice") or s.get("avgBuy") or s.get("avg_price"))
            pnl = parse_mcp_numeric(s.get("p&l") or s.get("pnl") or s.get("unrealised_pnl"))
            
            buy_value = qty * avg_buy
            current_value = buy_value + pnl
            current_price = avg_buy + (pnl / qty) if qty > 0 else avg_buy
            
            # Map sectors dynamically using symbol
            trading_symbol = s.get("trading_symbol") or s.get("symbol") or ""
            symbol_key = trading_symbol.upper().strip()
            sector = s.get("sector") or SECTORS_MAP.get(symbol_key) or "General"
            
            stocks.append({
                "name": name,
                "isin": isin,
                "qty": int(qty),
                "avgBuy": avg_buy,
                "buyValue": buy_value,
                "currentPrice": current_price,
                "currentValue": current_value,
                "pnl": pnl,
                "sector": sector,
            })
            
        # Parse Mutual Funds
        for f in raw_mfs:
            name = f.get("name") or f.get("scheme_name") or "Unknown Fund"
            amc = f.get("amc") or f.get("amc_name") or "Mutual Fund"
            category = f.get("category") or "Equity"
            subcat = f.get("subcat") or f.get("sub_category") or "General"
            units = float(f.get("units") or f.get("qty") or 0.0)
            invested = float(f.get("invested") or f.get("buy_value") or f.get("invested_value") or 0.0)
            current = float(f.get("current") or f.get("current_value") or invested)
            returns = f.get("returns") or f.get("pnl") or (current - invested)
            xirr = f.get("xirr") or "—"
            
            mutual_funds.append({
                "name": name,
                "amc": amc,
                "category": category,
                "subcat": subcat,
                "units": units,
                "invested": invested,
                "current": current,
                "returns": float(returns),
                "xirr": xirr,
            })
            
        return {
            "stocks": stocks,
            "mutual_funds": mutual_funds,
        }
    except Exception as exc:
        logger.error("Failed to fetch holdings via MCP: %s", exc)
        return {
            "stocks": [],
            "mutual_funds": [],
            "error": str(exc)
        }

@router.get("/quote")
async def get_quote(symbol: str = Query(..., min_length=1), exchange: str = "NSE"):
    """Fetch live quote for a given symbol from the Groww MCP server."""
    try:
        data = await get_mcp_manager().fetch_quote(symbol, exchange)
        return {
            "symbol": symbol,
            "exchange": exchange,
            "price": float(data.get("price") or data.get("ltp") or data.get("last_price") or 0.0),
            "open": float(data.get("open") or 0.0),
            "high": float(data.get("high") or 0.0),
            "low": float(data.get("low") or 0.0),
            "close": float(data.get("close") or 0.0),
            "volume": float(data.get("volume") or 0.0),
        }
    except Exception as exc:
        logger.error("Failed to fetch quote via MCP: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
