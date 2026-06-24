# Groww MCP (Model Context Protocol) Integration Guidelines

This workspace integrates the official Groww MCP server to bridge real-time brokerage account data (cash balance, margin details, stock holdings, positions) and market data directly into the **AI Investment OS**.

Any AI coding assistant operating in this workspace should adhere to the following tools list, system guidelines, and safety constraints.

---

## 1. Available Groww MCP Tools

### Category A: Portfolio & Account Information
*   **`get_equity_portfolio_holdings`**: Retrieves all your stock and ETF holdings (quantity, average buy price, current market value, and unrealized P&L).
*   **`get_available_margin_details`**: Fetches real-time available cash, collateral margin, utilized margin, and segment-specific margin balances (cnc/mis for stocks, future/options for derivatives).
*   **`get_my_trading_positions_today`**: Retrieves open intraday or carry-forward derivative/cash positions for the current day.
*   **`get_specific_stock_position`**: Looks up detailed position variables (average buy price, quantity, segment) for a specific symbol.

### Category B: Live Market Data & Technicals
*   **`get_ltp`**: Instantly fetches the Last Traded Price for a specific stock/index.
*   **`get_quotes_and_depth`**: Retrieves real-time stock/index bid-ask spreads, order depth (top buy/sell volumes), and session stats.
*   **`fetch_historical_candle_data`**: Pulls historical OHLCV (Open, High, Low, Close, Volume) candle data for technical analysis (daily/intraday).
*   **`get_historical_technical_indicators`**: Computes standard indicators (RSI, MACD, Bollinger Bands, Moving Averages) over historical candles.
*   **`get_historical_candlestick_patterns`**: Analyzes historical charts to identify patterns (Doji, Hammer, Engulfing, etc.).

### Category C: F&O (Derivatives) & Option Chain Analysis
*   **`get_open_interest_analysis`**: Analyzes Put-Call Ratio (PCR), spot price vs. ATM strike, and generates Open Interest structure/change details.
*   **`get_greeks_for_fno_symbol` / `get_greeks_for_fno_contract`**: Calculates Option Greeks (Delta, Gamma, Theta, Vega) for derivative symbols or specific contracts.
*   **`get_atm_straddle_chart`**: Calculates ATM straddle values and charts.
*   **`get_payoff_chart_steps`**: Calculates step-by-step risk-reward payoff matrices for options strategies (bull spreads, iron condors, etc.).
*   **`fno_mcx_contracts_search_tool` / `fetch_curated_fno`**: Locates derivatives contract details across NSE/BSE and MCX.

### Category D: Stock Screening & Research
*   **`fetch_stocks_fundamental_data`**: Pulls corporate fundamentals (P/E ratio, market cap, dividend yield, debt, financial ratios).
*   **`fetch_technical_screener`**: Filters stocks matching technical setups (overbought, oversold, breakout, volume spikes).
*   **`fetch_fundamentals_screener` / `fetch_etf_screener`**: Filters stocks/ETFs by financial metrics.
*   **`fetch_market_movers_and_trending_stocks_funds`**: Returns trending stock screeners (gainers, losers, active volumes).

### Category E: Orders & Utility Tools
*   **`get_order_details`**: Retrieves details and status logs for placed orders.
*   **`resolve_market_time_and_calendar`**: Inspects current NSE/BSE trading sessions, holiday calendars, and market status.
*   **`get_budget_announcement`**: Mandatory tool for Union Budget 2026 related tax queries (STT, capital gains tax limits, tax capex allocations).
*   **`fetch_ipo_listings` / `fetch_ipo_details`**: Retrieves upcoming, active, and completed IPO listings with performance metrics.
*   **`curate_symbols`**: Normalizes and maps conversational stock/index names to NSE/BSE trading symbols.

---

## 2. Codebase Integration Details

### Backend Access Pattern (Python)
- **Class Wrapper:** Use the `McpManager` class located in [manager.py](file:///c:/Users/Harish%20M/Desktop/Algo-Trading/ai-investment-os/backend/app/mcp/manager.py) to interact with the Groww MCP server.
- **Dynamic Tool Resolving:** The manager implements `_resolve_tool_name()` to dynamically match tools containing keywords (e.g., matching `"holding"` to `get_equity_portfolio_holdings`), protecting calls from minor API schema updates.
- **Numeric Parsing:** Always parse numeric values returned by Groww MCP using `parse_mcp_numeric` in [broker.py](file:///c:/Users/Harish%20M/Desktop/Algo-Trading/ai-investment-os/backend/app/api/v1/broker.py) to gracefully handle textual suffixes (e.g., `"1.05 Thousands"` or `"2.8 Lakhs"`).

### Sector Mapping & Data Normalization
- Because the Groww MCP server holdings tool does not supply sectors, map equity symbols to their correct sector names using `SECTORS_MAP` in [broker.py](file:///c:/Users/Harish%20M/Desktop/Algo-Trading/ai-investment-os/backend/app/api/v1/broker.py).
- For segments not currently supported by the Groww MCP (such as mutual fund portfolio queries), align values by appending verified assets directly to the normalized holdings data in [broker.py](file:///c:/Users/Harish%20M/Desktop/Algo-Trading/ai-investment-os/backend/app/api/v1/broker.py) so that the user's dashboard matches reality.

---

## 3. Core Safety Rules
*   **No Auto-Execution:** The AI must only analyze data, report indicators, and propose trades.
*   **TradeGuard Enforcement:** The `ExecutionService` and `TradeGuard` invariants remain the sole authority to execute trades and spend capital.
