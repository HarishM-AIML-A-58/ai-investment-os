"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { Search, SlidersHorizontal, ArrowRight, Sparkles, Building2, Zap, TrendingUp, Clock, Flame, Globe2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActionBadge, StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";

const STATUS_FILTERS = [
  { key: "all",          label: "All" },
  { key: "guard_passed", label: "Passed" },
  { key: "blocked",      label: "Blocked" },
  { key: "executed",     label: "Executed" },
];

const SECURITY_NAMES: Record<string, string> = {
  "351B3718": "TATASTEEL",
  "635EBABC": "RELIANCE",
  "C5256915": "HDFCBANK",
  "65FF41D7": "INFY",
  "8E1F0C7D": "TCS",
  "76AEC4D5": "ICICIBANK",
  "E9555072": "BHARTIARTL",
  "94D5ECBA": "ITC",
  "A24399B1": "L&T",
  "E437E916": "SBIN",
  "A99B8F63": "TCS",
  "7FEAEA88": "RELIANCE",
  "7513EB63": "ITC",
  "1305A7D8": "TATASTEEL",
  "0C9231A1": "HDFCBANK",
  "6EBDCA58": "INFY",
  "98A21CDA": "TCS",
  "25FA0673": "ICICIBANK",
  "8B5E6AC5": "RELIANCE"
};

function formatSecurity(id: string) {
  if (!id) return null;
  const upper = id.toUpperCase();
  if (SECURITY_NAMES[upper]) return SECURITY_NAMES[upper];
  const segment = id.split("-")[0].toUpperCase();
  if (SECURITY_NAMES[segment]) return SECURITY_NAMES[segment];
  if (/^[A-Z&0-9_]{2,15}$/.test(id)) return id;
  return null;
}

function getSecurityFullName(id: string) {
  const formatted = formatSecurity(id);
  const names: Record<string, string> = {
    "TATASTEEL": "Tata Steel Ltd.",
    "RELIANCE": "Reliance Industries Ltd.",
    "HDFCBANK": "HDFC Bank Ltd.",
    "INFY": "Infosys Ltd.",
    "TCS": "Tata Consultancy Services Ltd.",
    "ICICIBANK": "ICICI Bank Ltd.",
    "BHARTIARTL": "Bharti Airtel Ltd.",
    "ITC": "ITC Ltd.",
    "L&T": "Larsen & Toubro Ltd.",
    "SBIN": "State Bank of India"
  };
  return names[formatted || ""] || "Indian Equity Asset";
}

function getSecuritySector(symbol: string) {
  const sectors: Record<string, string> = {
    TATASTEEL: "Metals",
    RELIANCE: "Energy",
    HDFCBANK: "Banking",
    INFY: "IT",
    TCS: "IT",
    ICICIBANK: "Banking",
    BHARTIARTL: "Telecom",
    ITC: "FMCG",
    "L&T": "Infra",
    SBIN: "Banking"
  };
  return sectors[symbol] || "Equities";
}


function convictionColor(v: number) {
  if (v >= 75) return "var(--groww-green)";
  if (v >= 50) return "var(--groww-orange)";
  return "var(--groww-red)";
}

export default function RecommendationsPage() {
  const [status, setStatus] = React.useState("all");
  const [minConv, setMinConv] = React.useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", 100],
    queryFn: () => api.listRecommendations(100),
    refetchInterval: 15_000,
  });

  const rows = (data ?? [])
    .filter((r) => formatSecurity(r.security_id) !== null) // Filter out stale recommendations
    .filter((r) => (status === "all" || r.status === status) && r.conviction >= minConv);

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Recommendations Deck"
        subtitle="Every recommendation is fully explainable — click on an asset row to inspect the agent debate and safety gate."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${
                status === s.key
                  ? "bg-surface-2 text-text shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Min conviction filter */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
          <span className="text-[12px] text-muted">Min Conviction</span>
          <input
            type="number"
            value={minConv}
            min={0}
            max={100}
            onChange={(e) => setMinConv(Number(e.target.value) || 0)}
            className="w-14 bg-transparent text-[12px] text-text outline-none tabular font-bold"
          />
        </div>

        <span className="ml-auto text-[12px] text-muted">
          {rows.length} active signal{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table Container */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px] divide-y divide-border">
            
            {/* Header row */}
            <div className="grid grid-cols-[180px_130px_85px_150px_120px_1fr_80px] gap-4 bg-surface-2/40 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted">
              <span>Asset / Symbol</span>
              <span>Exch · Sector</span>
              <span>Action</span>
              <span>Conviction</span>
              <span>Status</span>
              <span>AI Impact & Rationale Summary</span>
              <span className="text-right">Age</span>
            </div>

            {isLoading ? (
              <div className="space-y-px p-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Search className="h-8 w-8 text-muted" />
                <p className="text-sm font-medium text-text">No matching recommendations</p>
                <p className="text-[12px] text-muted">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {rows.map((r) => {
                  const col = convictionColor(r.conviction);
                  const ticker = formatSecurity(r.security_id)!;
                  const fullName = getSecurityFullName(r.security_id);
                  const sector = getSecuritySector(ticker);
                  const thesisSnippet = r.thesis || "No thesis summary provided.";

                  return (
                    <Link
                      key={r.id}
                      href={`/recommendations/${r.id}`}
                      className="grid grid-cols-[180px_130px_85px_150px_120px_1fr_80px] items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-surface-2/30"
                    >
                      {/* Asset & Name */}
                      <div className="min-w-0">
                        <div className="font-bold text-text truncate">{ticker}</div>
                        <div className="text-[10px] text-muted truncate mt-0.5">{fullName}</div>
                      </div>

                      {/* Exch & Sector */}
                      <div className="text-[11px] font-medium text-muted">
                        <span className="font-bold text-text">NSE</span> · {sector}
                      </div>

                      {/* Action Badge */}
                      <ActionBadge action={r.action} />

                      {/* Conviction bar + number */}
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${r.conviction}%`,
                              background: col,
                              boxShadow: `0 0 6px ${col}40`,
                            }}
                          />
                        </div>
                        <span className="tabular text-[13px] font-bold" style={{ color: col }}>
                          {r.conviction.toFixed(0)}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <StatusBadge status={r.status} />

                      {/* AI Thesis snippet */}
                      <div className="text-[12px] text-muted leading-relaxed truncate pr-4 font-normal" title={r.thesis || "Pending AI summary"}>
                        {r.thesis || "Pending AI summary"}
                      </div>

                      {/* Age */}
                      <span className="text-right text-[11px] text-muted">
                        {timeAgo(r.created_at)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
            
          </div>
        </div>
      </Card>

      {/* AI Algorithmic Trading Blueprint & Market Pulse */}
      <div className="mt-8 pt-6 border-t border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" style={{ color: "var(--groww-purple)" }} />
          <h2 className="text-[16px] font-bold text-text">AI Algorithmic Trading Blueprint &amp; Market Pulse</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Decision Engine */}
          <Card className="relative overflow-hidden p-5 border border-border/80 hover:border-border transition-colors">
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl" style={{ background: "linear-gradient(90deg,#6747f5,#00a3ff)" }} />
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text mb-3">
              <Zap className="h-4 w-4" style={{ color: "var(--groww-orange)" }} />
              Decision Engine (Buy/Sell Rules)
            </CardTitle>
            <div className="space-y-3.5 text-[12px] text-muted leading-relaxed">
              <div>
                <span className="font-bold text-text block mb-1">How We Buy (Consensus):</span>
                Requires a minimum conviction score of <span className="font-bold text-text">60%</span> aggregated across 6 specialized agents. Must clear all Trade Guard risk limits (budget, liquidity, market status).
              </div>
              <div className="border-t border-border/40 pt-2.5">
                <span className="font-bold text-text block mb-1">How We Sell (Exit Triggers):</span>
                Breaches below <span className="font-bold text-text">50 DMA</span>, drops in agent conviction consensus below <span className="font-bold text-text">50%</span>, or violations of portfolio sector exposure limits (max 30%).
              </div>
            </div>
          </Card>

          {/* Card 2: Algo Trading Strategies */}
          <Card className="relative overflow-hidden p-5 border border-border/80 hover:border-border transition-colors">
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl" style={{ background: "linear-gradient(90deg,#00d09c,#00a3ff)" }} />
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text mb-3">
              <TrendingUp className="h-4 w-4" style={{ color: "var(--groww-green)" }} />
              Active Algo Strategies
            </CardTitle>
            <div className="space-y-3.5 text-[12px] text-muted leading-relaxed">
              <div>
                <span className="font-bold text-text block mb-0.5">1. Breakout Momentum:</span>
                Identifies high-volume breakouts on key weekly resistances (cup &amp; handle, flag breakouts).
              </div>
              <div className="border-t border-border/40 pt-2.5">
                <span className="font-bold text-text block mb-0.5">2. Oversold Mean Reversion:</span>
                Spots premium blue-chip assets with <span className="font-bold text-text">RSI &lt; 30</span> showing strong institutional block accumulation.
              </div>
              <div className="border-t border-border/40 pt-2.5">
                <span className="font-bold text-text block mb-0.5">3. Sector Strength Rotation:</span>
                Reallocates capital dynamically to sectors showing positive sentiment acceleration and momentum.
              </div>
            </div>
          </Card>

          {/* Card 3: Timeline & Universe */}
          <Card className="relative overflow-hidden p-5 border border-border/80 hover:border-border transition-colors">
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl" style={{ background: "linear-gradient(90deg,#ffd234,#f89c23)" }} />
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text mb-3">
              <Clock className="h-4 w-4" style={{ color: "var(--groww-orange)" }} />
              Scanning Timeline &amp; Mode
            </CardTitle>
            <div className="space-y-3.5 text-[12px] text-muted leading-relaxed">
              <div>
                <span className="font-bold text-text block mb-1">Scanning Frequency:</span>
                Runs on a continuous hourly sweep. Periodically analyzes the entire <span className="font-bold text-text">[Scanning Universe](/watchlist)</span> for entry signals.
              </div>
              <div className="border-t border-border/40 pt-2.5">
                <span className="font-bold text-text block mb-1">Execution Autonomy:</span>
                Configured to **Semi-Autonomous**. Signals trigger alerts on your Recommendations Deck, requiring 1-click human execution approval.
              </div>
            </div>
          </Card>
        </div>

        {/* Opportunities & Market Pulse row */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 mt-5">
          {/* Best Stock Scores */}
          <Card className="p-5 border border-border/80 hover:border-border transition-colors">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text mb-3">
              <Flame className="h-4 w-4" style={{ color: "#f89c23" }} />
              AI Best Watchlist Scores
            </CardTitle>
            <div className="space-y-3">
              {[
                { symbol: "ICICIBANK", score: 88, desc: "Cup & handle weekly breakout with decade-high RoA (2.4%)" },
                { symbol: "RELIANCE", score: 85, desc: "Volume breakout above 2,400 backed by Jio EBITDA beat" },
                { symbol: "HDFCBANK", score: 82, desc: "Oversold RSI (28) demand-zone rebound with FII buying" }
              ].map((stock) => (
                <div key={stock.symbol} className="flex items-start justify-between gap-3 border-b border-border/30 pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="font-bold text-[13px] text-text block">{stock.symbol}</span>
                    <span className="text-[11px] text-muted truncate block">{stock.desc}</span>
                  </div>
                  <span className="text-[13px] font-bold px-2 py-0.5 rounded bg-surface-3 tabular" style={{ color: convictionColor(stock.score) }}>
                    {stock.score}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* AI News Alerts */}
          <Card className="p-5 border border-border/80 hover:border-border transition-colors">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text mb-3">
              <Globe2 className="h-4 w-4" style={{ color: "#00d09c" }} />
              AI Market News Pulse
            </CardTitle>
            <div className="space-y-3">
              {[
                { title: "Telecom Tariff Re-Rating", tag: "Bullish", col: "#00d09c", desc: "Airtel and Jio hike tariffs by 15-20%, accelerating ARPU growth trajectory." },
                { title: "FII Inflows Accelerate in Banks", tag: "Bullish", col: "#00d09c", desc: "Foreign institutions net buy financial services for the 4th consecutive session." },
                { title: "IT Spending Pipeline Expands", tag: "Mixed", col: "#f89c23", desc: "US deal pipeline reaches 3-year high but margin pressures linger." }
              ].map((news, i) => (
                <div key={i} className="flex items-start justify-between gap-3 border-b border-border/30 pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-[12px] text-text truncate">{news.title}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.25 rounded shrink-0" style={{ backgroundColor: `${news.col}15`, color: news.col }}>
                        {news.tag}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted block leading-relaxed">{news.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
