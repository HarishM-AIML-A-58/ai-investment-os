"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { Search, SlidersHorizontal, Sparkles, Zap, TrendingUp, Clock, Flame, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActionBadge, StatusBadge } from "@/components/status-badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";

const STATUS_FILTERS = [
  { key: "all",          label: "All" },
  { key: "guard_passed", label: "Passed" },
  { key: "blocked",      label: "Blocked" },
  { key: "executed",     label: "Executed" },
];

function convictionColor(v: number) {
  if (v >= 75) return "var(--groww-green)";
  if (v >= 50) return "var(--groww-orange)";
  return "var(--groww-red)";
}

export default function RecommendationsPage() {
  const [status, setStatus] = React.useState("all");
  const [minConv, setMinConv] = React.useState(0);
  const [scanMsg, setScanMsg] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", 100],
    queryFn: () => api.listRecommendations(100),
    refetchInterval: 15_000,
  });

  const scanMutation = useMutation({
    mutationFn: () => api.scanNow(),
    onSuccess: (result) => {
      if (result.skipped) {
        setScanMsg(`Skipped: ${result.skipped}`);
      } else {
        setScanMsg(`Scanned ${result.scanned} symbol${result.scanned !== 1 ? "s" : ""}: ${(result.symbols ?? []).join(", ")}`);
        queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      }
      setTimeout(() => setScanMsg(null), 8000);
    },
    onError: () => {
      setScanMsg("Scan failed — check API is running.");
      setTimeout(() => setScanMsg(null), 6000);
    },
  });

  const rows = (data ?? [])
    .filter((r) => (status === "all" || r.status === status) && r.conviction >= minConv);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Recommendations Deck"
          subtitle="Every recommendation is fully explainable — click on an asset row to inspect the agent debate and safety gate."
        />
        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
          <button
            onClick={() => { setScanMsg(null); scanMutation.mutate(); }}
            disabled={scanMutation.isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: "var(--groww-purple)" }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanMutation.isPending ? "animate-spin" : ""}`} />
            {scanMutation.isPending ? "Scanning…" : "Scan Now"}
          </button>
          {scanMsg && (
            <span className="text-[11px] text-muted max-w-[240px] text-right leading-snug">{scanMsg}</span>
          )}
        </div>
      </div>

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

                  return (
                    <Link
                      key={r.id}
                      href={`/recommendations/${r.id}`}
                      className="grid grid-cols-[180px_130px_85px_150px_120px_1fr_80px] items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-surface-2/30"
                    >
                      {/* Asset & Symbol */}
                      <div className="min-w-0">
                        <div className="font-bold text-text truncate">{r.symbol}</div>
                        <div className="text-[10px] text-muted truncate mt-0.5">{r.exchange}</div>
                      </div>

                      {/* Exchange */}
                      <div className="text-[11px] font-medium text-muted">
                        <span className="font-bold text-text">{r.exchange}</span>
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

        {/* Live top signals from real recommendations */}
        <div className="mt-5">
          <Card className="p-5 border border-border/80">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text mb-3">
              <Flame className="h-4 w-4" style={{ color: "#f89c23" }} />
              Top Conviction Signals
              <span className="text-[10px] font-medium text-muted ml-1">Live · highest scoring BUY picks</span>
            </CardTitle>
            {data && data.filter(r => r.action.toLowerCase() === "buy").length === 0 ? (
              <p className="text-[12px] text-muted py-4 text-center">No BUY signals yet — click "Scan Now" to generate picks.</p>
            ) : (
              <div className="space-y-2">
                {(data ?? [])
                  .filter(r => r.action.toLowerCase() === "buy")
                  .sort((a, b) => b.conviction - a.conviction)
                  .slice(0, 5)
                  .map((r) => {
                    const col = convictionColor(r.conviction);
                    return (
                      <Link
                        key={r.id}
                        href={`/recommendations/${r.id}`}
                        className="flex items-center justify-between gap-3 border-b border-border/30 pb-2 last:border-0 last:pb-0 hover:opacity-80 transition-opacity"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-[13px] text-text block">{r.symbol}</span>
                          <span className="text-[11px] text-muted truncate block max-w-xs">
                            {r.thesis || "View full AI thesis →"}
                          </span>
                        </div>
                        <span className="text-[13px] font-bold px-2 py-0.5 rounded bg-surface-3 tabular shrink-0" style={{ color: col }}>
                          {r.conviction.toFixed(0)}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
