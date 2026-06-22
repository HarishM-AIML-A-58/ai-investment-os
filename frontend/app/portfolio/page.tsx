"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, BarChart2,
  ArrowUpRight, ArrowDownRight, PieChartIcon, Layers,
} from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

/* ── Real portfolio data (Groww statement 20-06-2026) ──────── */
const STOCKS: {
  name: string; isin: string; qty: number;
  avgBuy: number; buyValue: number; currentPrice: number;
  currentValue: number; pnl: number; sector: string;
}[] = [
  { name: "HDFC BANK LTD",           isin: "INE040A01034", qty: 2,   avgBuy: 814.20,  buyValue: 1628.40,  currentPrice: 779.80,  currentValue: 1559.60,  pnl: -68.80,   sector: "Banking" },
  { name: "ICICI BANK LTD",          isin: "INE090A01021", qty: 1,   avgBuy: 1257.30, buyValue: 1257.30,  currentPrice: 1346.50, currentValue: 1346.50,  pnl: 89.20,    sector: "Banking" },
  { name: "IDFC FIRST BANK",         isin: "INE092T01019", qty: 4,   avgBuy: 85.97,   buyValue: 343.88,   currentPrice: 78.68,   currentValue: 314.72,   pnl: -29.16,   sector: "Banking" },
  { name: "INDIAN ENERGY EXCH",      isin: "INE022Q01020", qty: 8,   avgBuy: 132.77,  buyValue: 1062.16,  currentPrice: 122.78,  currentValue: 982.24,   pnl: -79.92,   sector: "Energy" },
  { name: "NIPPON ETF GOLD BEES",    isin: "INF204KB17I5", qty: 183, avgBuy: 123.80,  buyValue: 22655.40, currentPrice: 119.79,  currentValue: 21921.57, pnl: -733.83,  sector: "Gold ETF" },
  { name: "NIPPON ETF IT",           isin: "INF204KB15V2", qty: 39,  avgBuy: 34.31,   buyValue: 1338.09,  currentPrice: 30.41,   currentValue: 1185.99,  pnl: -152.10,  sector: "IT ETF" },
  { name: "NIPPON ETF NIFTY BEES",   isin: "INF204KB14I2", qty: 12,  avgBuy: 270.54,  buyValue: 3246.48,  currentPrice: 272.95,  currentValue: 3275.40,  pnl: 28.92,    sector: "Index ETF" },
  { name: "NIPPON ETF PHARMA",       isin: "INF204KC1089", qty: 2,   avgBuy: 23.06,   buyValue: 46.12,    currentPrice: 25.09,   currentValue: 50.18,    pnl: 4.06,     sector: "Pharma ETF" },
  { name: "NIPPON ETF SILVER",       isin: "INF204KC1402", qty: 30,  avgBuy: 290.32,  buyValue: 8709.60,  currentPrice: 221.42,  currentValue: 6642.60,  pnl: -2067.00, sector: "Commodity ETF" },
  { name: "OIL & NATURAL GAS CORP",  isin: "INE213A01029", qty: 4,   avgBuy: 241.00,  buyValue: 964.00,   currentPrice: 246.25,  currentValue: 985.00,   pnl: 21.00,    sector: "Energy" },
  { name: "POWERGRID INFRA INVIT",   isin: "INE0GGX23010", qty: 3,   avgBuy: 91.80,   buyValue: 275.40,   currentPrice: 93.89,   currentValue: 281.67,   pnl: 6.27,     sector: "Infra" },
  { name: "PTC INDIA LTD",           isin: "INE877F01012", qty: 2,   avgBuy: 164.89,  buyValue: 329.78,   currentPrice: 186.65,  currentValue: 373.30,   pnl: 43.52,    sector: "Energy" },
  { name: "SPICEJET LTD",            isin: "INE285B01017", qty: 1,   avgBuy: 36.73,   buyValue: 36.73,    currentPrice: 12.63,   currentValue: 12.63,    pnl: -24.10,   sector: "Aviation" },
  { name: "SUZLON ENERGY",           isin: "INE040H01021", qty: 2,   avgBuy: 52.27,   buyValue: 104.54,   currentPrice: 59.20,   currentValue: 118.40,   pnl: 13.86,    sector: "Renewables" },
  { name: "TATA MOTORS",             isin: "INE155A01022", qty: 3,   avgBuy: 355.60,  buyValue: 1066.80,  currentPrice: 359.50,  currentValue: 1078.50,  pnl: 11.70,    sector: "Auto" },
  { name: "TATA GOLD ETF",           isin: "INF277KA1976", qty: 37,  avgBuy: 14.35,   buyValue: 530.95,   currentPrice: 14.08,   currentValue: 520.96,   pnl: -9.99,    sector: "Gold ETF" },
  { name: "SOUTH INDIAN BANK",       isin: "INE683A01023", qty: 73,  avgBuy: 38.39,   buyValue: 2802.47,  currentPrice: 48.46,   currentValue: 3537.58,  pnl: 735.11,   sector: "Banking" },
  { name: "TRIDENT LTD",             isin: "INE064C01022", qty: 30,  avgBuy: 26.27,   buyValue: 788.10,   currentPrice: 25.93,   currentValue: 777.90,   pnl: -10.20,   sector: "Textiles" },
  { name: "UJJIVAN SMALL FIN BANK",  isin: "INE551W01018", qty: 31,  avgBuy: 57.64,   buyValue: 1786.84,  currentPrice: 57.27,   currentValue: 1775.37,  pnl: -11.47,   sector: "Banking" },
  { name: "VODAFONE IDEA",           isin: "INE669E01016", qty: 3,   avgBuy: 10.02,   buyValue: 30.06,    currentPrice: 14.92,   currentValue: 44.76,    pnl: 14.70,    sector: "Telecom" },
  { name: "YES BANK LTD",            isin: "INE528G01035", qty: 17,  avgBuy: 21.67,   buyValue: 368.39,   currentPrice: 25.41,   currentValue: 431.97,   pnl: 63.58,    sector: "Banking" },
  { name: "ZERODHA GOLD CASE",       isin: "INF0R8F01042", qty: 60,  avgBuy: 22.30,   buyValue: 1338.00,  currentPrice: 22.77,   currentValue: 1366.20,  pnl: 28.20,    sector: "Gold ETF" },
];

const MUTUAL_FUNDS: {
  name: string; amc: string; category: string; subcat: string;
  units: number; invested: number; current: number; returns: number; xirr: string;
}[] = [
  { name: "HDFC Mid Cap Fund", amc: "HDFC Mutual Fund", category: "Equity", subcat: "Mid Cap", units: 28.068, invested: 5999.72, current: 6357.32, returns: 357.60, xirr: "34.69%" },
  { name: "Kotak Midcap Fund", amc: "Kotak Mahindra MF", category: "Equity", subcat: "Mid Cap", units: 30.746, invested: 4999.73, current: 5213.08, returns: 213.35, xirr: "—" },
  { name: "Nippon India Large Cap Fund", amc: "Nippon India MF", category: "Equity", subcat: "Large Cap", units: 61.334, invested: 5999.72, current: 6181.39, returns: 181.67, xirr: "16.79%" },
];

/* ── Derived totals ──────────────────────────────────────────── */
const stockInvested  = STOCKS.reduce((s, h) => s + h.buyValue, 0);
const stockCurrent   = STOCKS.reduce((s, h) => s + h.currentValue, 0);
const stockPnL       = stockCurrent - stockInvested;
const mfInvested     = MUTUAL_FUNDS.reduce((s, f) => s + f.invested, 0);
const mfCurrent      = MUTUAL_FUNDS.reduce((s, f) => s + f.current, 0);
const mfPnL          = mfCurrent - mfInvested;
const totalInvested  = stockInvested + mfInvested;
const totalCurrent   = stockCurrent + mfCurrent;
const totalPnL       = totalCurrent - totalInvested;
const totalPnLPct    = (totalPnL / totalInvested) * 100;

/* ── Sector chart data ────────────────────────────────────────── */
const SECTOR_COLORS: Record<string, string> = {
  Banking: "#6747f5", "Gold ETF": "#ffd234", Energy: "#f89c23",
  "Commodity ETF": "#00bfa5", "Index ETF": "#00a3ff", "IT ETF": "#4c6ef5",
  "Pharma ETF": "#00d09c", Infra: "#ff6b9d", Aviation: "#eb3b5a",
  Renewables: "#00d09c", Auto: "#f89c23", Textiles: "#888899", Telecom: "#00bfa5",
};

const sectorData = buildSectorData();

function buildSectorData() {
  const map: Record<string, number> = {};
  STOCKS.forEach(s => { map[s.sector] = (map[s.sector] ?? 0) + s.currentValue; });
  MUTUAL_FUNDS.forEach(f => { const k = f.subcat; map[k] = (map[k] ?? 0) + f.current; });
  return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(0) }))
    .sort((a, b) => b.value - a.value);
}

const PIE_DATA = buildSectorData();
const PIE_COLORS = ["#6747f5","#ffd234","#f89c23","#00bfa5","#00a3ff","#4c6ef5","#00d09c","#ff6b9d","#eb3b5a","#888899","#00d09c","#f89c23","#00bfa5"];

/* ── Formatting helpers ───────────────────────────────────────── */
function rupee(n: number, showSign = false) {
  const abs = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (showSign) return `${n >= 0 ? "+" : "-"}₹${abs}`;
  return `${n < 0 ? "-" : ""}₹${abs}`;
}
function pct(n: number, showSign = false) {
  const sign = showSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-[12px] shadow-card">
      <p className="font-bold text-text mb-0.5">{p.name}</p>
      <p style={{ color: p.color ?? p.fill }} className="tabular font-bold">{rupee(p.value)}</p>
    </div>
  );
}

type Tab = "stocks" | "mf";

export default function PortfolioPage() {
  const [tab, setTab] = React.useState<Tab>("stocks");
  const isProfit = totalPnL >= 0;

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── Page heading ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-4 w-4" style={{ color: "var(--groww-purple)" }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--groww-purple)" }}>
            Murugan Harish · 8804517660
          </span>
        </div>
        <h1 className="text-[24px] font-bold tracking-tight text-text">Portfolio Deck</h1>
        <p className="text-[13px] text-muted mt-0.5">
          Holdings as on 20 Jun 2026 · Groww Demat · NSE / BSE
        </p>
      </div>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total Invested",
            value: rupee(totalInvested),
            sub: `Stocks ${rupee(stockInvested)} · MF ${rupee(mfInvested)}`,
            color: "#6747f5",
            icon: Wallet,
          },
          {
            label: "Current Value",
            value: rupee(totalCurrent),
            sub: `Stocks ${rupee(stockCurrent)} · MF ${rupee(mfCurrent)}`,
            color: "#00a3ff",
            icon: BarChart2,
          },
          {
            label: "Total P&L",
            value: rupee(totalPnL, true),
            sub: `${pct(totalPnLPct, true)} overall return`,
            color: isProfit ? "#00d09c" : "#eb3b5a",
            icon: isProfit ? TrendingUp : TrendingDown,
          },
          {
            label: "Unrealised (Stocks)",
            value: rupee(stockPnL, true),
            sub: `MF returns ${rupee(mfPnL, true)}`,
            color: stockPnL >= 0 ? "#00d09c" : "#eb3b5a",
            icon: stockPnL >= 0 ? ArrowUpRight : ArrowDownRight,
          },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="relative overflow-hidden rounded-xl border border-border bg-surface p-4">
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</span>
              <div className="h-6 w-6 flex items-center justify-center rounded-md" style={{ background: `${color}15` }}>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
            </div>
            <div className="tabular text-[22px] font-bold leading-tight" style={{ color }}>{value}</div>
            <div className="mt-1 text-[11px] text-muted">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main two-column layout ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">

        {/* Left: Holdings table */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border px-4 py-3">
            {([
              { key: "stocks", label: `Stocks (${STOCKS.length})` },
              { key: "mf",     label: `Mutual Funds (${MUTUAL_FUNDS.length})` },
            ] as { key: Tab; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                  tab === key
                    ? "text-text bg-surface-2"
                    : "text-muted hover:text-text hover:bg-surface-2/50"
                }`}
              >
                {tab === key && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "rgba(103,71,245,.1)", border: "1px solid rgba(103,71,245,.2)" }}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-[#00d09c] animate-pulse" />
              <span className="text-[11px] font-medium text-[#00d09c]">Live</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {tab === "stocks" ? (
              <motion.div key="stocks" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* Stock table header */}
                <div className="grid grid-cols-[2fr_60px_80px_80px_80px_90px_80px] gap-2 border-b border-border bg-surface-2/40 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                  <span>Stock</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Avg Buy</span>
                  <span className="text-right">Buy Val</span>
                  <span className="text-right">Curr Price</span>
                  <span className="text-right">Curr Value</span>
                  <span className="text-right">P&L</span>
                </div>
                <div className="divide-y divide-border/50 max-h-[520px] overflow-y-auto">
                  {STOCKS.map((s, i) => {
                    const isUp = s.pnl >= 0;
                    const sColor = SECTOR_COLORS[s.sector] ?? "#888";
                    const pnlPct = (s.pnl / s.buyValue) * 100;
                    return (
                      <motion.div
                        key={s.isin}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.025 }}
                        className="grid grid-cols-[2fr_60px_80px_80px_80px_90px_80px] gap-2 items-center px-5 py-3 hover:bg-surface-2/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-[9px] font-bold"
                            style={{ background: `${sColor}15`, color: sColor }}
                          >
                            {s.name.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold text-text truncate leading-tight">{s.name}</div>
                            <div className="text-[10px] text-muted" style={{ color: sColor }}>{s.sector}</div>
                          </div>
                        </div>
                        <div className="text-right tabular text-[12px] font-semibold text-text">{s.qty}</div>
                        <div className="text-right tabular text-[12px] text-muted">₹{s.avgBuy.toFixed(2)}</div>
                        <div className="text-right tabular text-[12px] text-muted">₹{s.buyValue.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        <div className="text-right tabular text-[12px] font-semibold text-text">₹{s.currentPrice.toFixed(2)}</div>
                        <div className="text-right tabular text-[12px] font-bold text-text">₹{s.currentValue.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        <div className="text-right">
                          <div
                            className="tabular text-[12px] font-bold flex items-center justify-end gap-0.5"
                            style={{ color: isUp ? "#00d09c" : "#eb3b5a" }}
                          >
                            {isUp ? <ArrowUpRight className="h-3 w-3 shrink-0" /> : <ArrowDownRight className="h-3 w-3 shrink-0" />}
                            ₹{Math.abs(s.pnl).toFixed(0)}
                          </div>
                          <div className="tabular text-[10px]" style={{ color: isUp ? "#00d09c" : "#eb3b5a" }}>
                            {isUp ? "+" : ""}{pnlPct.toFixed(1)}%
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Stocks total row */}
                <div className="grid grid-cols-[2fr_60px_80px_80px_80px_90px_80px] gap-2 items-center border-t border-border bg-surface-2/60 px-5 py-3">
                  <div className="text-[12px] font-bold text-text">Total ({STOCKS.length} stocks)</div>
                  <div />
                  <div />
                  <div className="text-right tabular text-[12px] font-bold text-text">₹{stockInvested.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <div />
                  <div className="text-right tabular text-[12px] font-bold text-text">₹{stockCurrent.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <div className="text-right">
                    <div className="tabular text-[12px] font-bold" style={{ color: stockPnL >= 0 ? "#00d09c" : "#eb3b5a" }}>
                      {stockPnL >= 0 ? "+" : ""}₹{Math.abs(stockPnL).toFixed(0)}
                    </div>
                    <div className="tabular text-[10px]" style={{ color: stockPnL >= 0 ? "#00d09c" : "#eb3b5a" }}>
                      {((stockPnL / stockInvested) * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </motion.div>

            ) : (
              <motion.div key="mf" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* MF summary row */}
                <div className="flex items-center gap-6 px-5 py-3 border-b border-border bg-surface-2/30">
                  {[
                    { label: "Total Invested", value: rupee(mfInvested), color: "#6747f5" },
                    { label: "Current Value",  value: rupee(mfCurrent),  color: "#00a3ff" },
                    { label: "Total Returns",  value: rupee(mfPnL, true), color: mfPnL >= 0 ? "#00d09c" : "#eb3b5a" },
                    { label: "XIRR (avg)",     value: "29.29%",          color: "#f89c23" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="text-[10px] text-muted mb-0.5">{label}</div>
                      <div className="tabular text-[14px] font-bold" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* MF cards */}
                <div className="p-4 space-y-3">
                  {MUTUAL_FUNDS.map((f, i) => {
                    const isUp = f.returns >= 0;
                    const retPct = (f.returns / f.invested) * 100;
                    const catColor = f.subcat === "Mid Cap" ? "#f89c23" : "#6747f5";
                    return (
                      <motion.div
                        key={f.name}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="rounded-xl border border-border bg-surface-2/30 p-4 hover:bg-surface-2/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold text-text leading-tight mb-1">{f.name}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-muted">{f.amc}</span>
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: `${catColor}15`, color: catColor }}
                              >
                                {f.subcat}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="tabular text-[18px] font-bold text-text">₹{f.current.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                            <div className="tabular text-[12px] font-semibold" style={{ color: isUp ? "#00d09c" : "#eb3b5a" }}>
                              {isUp ? "+" : ""}₹{f.returns.toFixed(2)} ({isUp ? "+" : ""}{retPct.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          {[
                            { label: "Units", value: f.units.toFixed(3), color: "#888" },
                            { label: "Invested", value: `₹${f.invested.toLocaleString("en-IN")}`, color: "#888" },
                            { label: "XIRR", value: f.xirr, color: isUp ? "#00d09c" : "#888" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="rounded-lg bg-surface p-2 border border-border/50">
                              <div className="text-[9px] text-muted uppercase tracking-wider mb-0.5">{label}</div>
                              <div className="tabular text-[12px] font-bold" style={{ color }}>{value}</div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Sector pie */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <PieChartIcon className="h-4 w-4 text-muted" />
              <span className="text-[13px] font-bold text-text">Sector Allocation</span>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={PIE_DATA}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    strokeWidth={2}
                    stroke="var(--surface)"
                  >
                    {PIE_DATA.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-2 space-y-1.5 max-h-[260px] overflow-y-auto">
                {PIE_DATA.map((entry, i) => {
                  const color = PIE_COLORS[i % PIE_COLORS.length];
                  const total = PIE_DATA.reduce((s, d) => s + d.value, 0);
                  const pctVal = ((entry.value / total) * 100).toFixed(1);
                  return (
                    <div key={entry.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="text-[11px] text-muted truncate">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="tabular text-[11px] font-semibold text-text">₹{entry.value.toLocaleString("en-IN")}</span>
                        <span className="tabular text-[10px] font-bold w-10 text-right" style={{ color }}>{pctVal}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-3.5 w-3.5 text-muted" />
              <span className="text-[12px] font-bold text-text">Quick Stats</span>
            </div>
            {[
              { label: "Total Holdings", value: `${STOCKS.length} stocks · ${MUTUAL_FUNDS.length} MFs`, color: "#6747f5" },
              { label: "Portfolio Return", value: pct(totalPnLPct, true), color: totalPnL >= 0 ? "#00d09c" : "#eb3b5a" },
              { label: "Best Performer", value: "SOUTH INDIAN BANK +₹735", color: "#00d09c" },
              { label: "Worst Performer", value: "NIPPON SILVER -₹2,067", color: "#eb3b5a" },
              { label: "Biggest Hold",   value: "GOLD BEES · ₹21,921", color: "#ffd234" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] text-muted">{label}</span>
                <span className="text-[11px] font-bold tabular" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
