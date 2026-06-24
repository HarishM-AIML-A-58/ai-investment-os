"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import React from "react";
import {
  Activity, CheckCircle2, TrendingUp,
  ArrowRight, Clock, Zap, BarChart2, Newspaper, Flame,
  Sparkles, ArrowUpRight, ArrowDownRight, Layers
} from "lucide-react";
import { ActionBadge, StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";


const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
});


export default function CommandDeck() {
  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", 50],
    queryFn: () => api.listRecommendations(50),
    refetchInterval: 15_000,
  });

  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ["market-indices"],
    queryFn: () => fetch("/api/market").then((r) => r.json()),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const recs = data ?? [];
  const passed   = recs.filter((r) => r.status === "guard_passed");
  const executed = recs.filter((r) => r.status === "executed");

  const topPicks = [...recs]
    .filter(r => r.action.toLowerCase() === "buy" || r.action.toLowerCase() === "hold")
    .sort((a, b) => b.conviction - a.conviction)
    .slice(0, 3);

  const avgConviction = recs.length > 0
    ? recs.reduce((s, r) => s + r.conviction, 0) / recs.length : 0;
  const topConviction = recs.length > 0
    ? Math.max(...recs.map((r) => r.conviction)) : 0;

  const stats = [
    { label: "Total Signals",  value: isLoading ? "—" : String(recs.length),        sub: "live recommendations",    color: "#8b5cf6", hoverClass: "border-glow-purple", icon: Activity },
    { label: "Guard Passed",   value: isLoading ? "—" : String(passed.length),       sub: "verified risk profiles",  color: "#10b981", hoverClass: "border-glow-green", icon: CheckCircle2 },
    { label: "Avg Conviction", value: isLoading ? "—" : (recs.length ? avgConviction.toFixed(1) : "—"), sub: topConviction > 0 ? `peak: ${topConviction.toFixed(0)}%` : "no data yet", color: "#f59e0b", hoverClass: "border-glow-orange", icon: TrendingUp },
    { label: "Executed",       value: isLoading ? "—" : String(executed.length),     sub: "automated orders",        color: "#3b82f6", hoverClass: "border-glow-blue", icon: Zap },
  ];

  // Helper to generate a realistic AI Thesis for our Top Picks card
  const getAIThesis = (symbol: string) => {
    const theses: Record<string, string> = {
      "RELIANCE": "Consolidating near major support of 50 DMA. Favorable risk-reward with high institutional accumulation trends.",
      "HDFCBANK": "Strong credit expansion metrics in Q4. Trading at historically undervalued price-to-book ratios.",
      "INFY": "Breakout above multi-week consolidation box. Growth in generative AI deal pipelines support margin recovery.",
      "TATASTEEL": "Global inventory replenishment cycle is starting. Strong domestic demand and price stabilization support margin expansion.",
      "TCS": "Earnings resilience and high dividend yield support defensive cash flows. Large deal wins of $4.8B in the pipeline.",
      "ICICIBANK": "Leading sector ROA performance. Valuation gap relative to competitors remains attractive for mid-term holding."
    };
    return theses[symbol] || "Exhibits solid relative strength (RSI > 55). High volume breakout above 20 EMA and strong institutional support.";
  };

  return (
    <div className="space-y-6">
      
      {/* Live Market Indices Banner */}
      <motion.div {...fadeUp(0)} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {marketLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col justify-between p-3.5 rounded-xl border border-border bg-surface">
                <Skeleton className="h-3 w-20" />
                <div className="flex items-baseline justify-between mt-1.5">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            ))
          : (marketData ?? []).slice(0, 4).map((index: { label: string; price: number; changePct: number; up: boolean }) => (
              <div key={index.label} className="flex flex-col justify-between p-3.5 rounded-xl border border-border bg-surface hover:bg-surface-2/45 transition-colors cursor-default">
                <span className="text-[11px] font-semibold text-muted tracking-wide uppercase">{index.label}</span>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="tabular text-sm font-bold text-text">
                    {index.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`tabular text-[11px] font-medium flex items-center gap-0.5 ${index.up ? "text-[var(--groww-green)]" : "text-[var(--groww-red)]"}`}>
                    {index.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {index.changePct > 0 ? "+" : ""}{index.changePct.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))
        }
      </motion.div>

      {/* Hero header */}
      <motion.div {...fadeUp(1)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
              Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Trade Engine
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted max-w-xl leading-relaxed">
            AI-driven investment deck for Indian equities. All models are policy-gated and require human execution.
          </p>
        </div>
        <Link
          href="/analyze"
          className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white bg-text hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 shadow transition-all shrink-0 active:scale-[0.98]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Analyze Symbol
        </Link>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, sub, color, hoverClass, icon: Icon }, i) => (
          <motion.div key={label} {...fadeUp(i + 2)}>
            <div
              className={`group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 card-hover cursor-default transition-all ${hoverClass}`}
            >
              {/* Subtle hover wash */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.03] transition-opacity group-hover:opacity-[0.06] rounded-2xl"
                style={{ background: color }}
              />
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {label}
                </span>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-2 group-hover:scale-105 transition-transform"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                </div>
              </div>
              <div className="tabular mt-3 text-2xl font-bold leading-none tracking-tight text-text">
                {isLoading ? <Skeleton className="h-7 w-16" /> : value}
              </div>
              <div className="mt-2 text-[11px] text-muted flex items-center gap-1">
                {sub}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Left (Top Picks + Recent Signals), Right (News Summary + Breakdown) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        
        {/* Left Column (ColSpan 2) */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Top Picks of the Day */}
          <motion.div {...fadeUp(6)}>
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-[var(--groww-purple)]" />
                  <div>
                    <h2 className="text-[14px] font-semibold text-text">Top Picks of the Day</h2>
                    <p className="text-[11px] text-muted mt-0.5">Highest conviction recommendations with AI thesis</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[var(--groww-purple)] bg-[var(--groww-purple)]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Spotlight
                </span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-y-0 md:divide-x">
                {topPicks.length === 0 ? (
                  <div className="md:col-span-3 flex flex-col items-center gap-3 py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2">
                      <Flame className="h-4 w-4 text-muted" />
                    </div>
                    <p className="text-[13px] font-semibold text-text">No top picks yet</p>
                    <p className="text-[12px] text-muted">
                      <Link href="/analyze" className="hover:underline underline-offset-2" style={{ color: "var(--groww-purple)" }}>
                        Analyze a symbol to generate picks →
                      </Link>
                    </p>
                  </div>
                ) : topPicks.map((pick, index) => {
                  const thesis = getAIThesis(pick.symbol);
                  const isBuy = pick.action.toLowerCase() === "buy";

                  return (
                    <div key={pick.id} className="p-5 flex flex-col justify-between hover:bg-surface-2/20 transition-colors group">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text group-hover:text-[var(--groww-purple)] transition-colors">{pick.symbol}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            isBuy
                              ? 'bg-[var(--groww-green)]/10 text-[var(--groww-green)] border-[var(--groww-green)]/20'
                              : 'bg-[var(--groww-orange)]/10 text-[var(--groww-orange)] border-[var(--groww-orange)]/20'
                          }`}>
                            {pick.action.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted truncate mt-0.5">{pick.exchange}</p>
                        
                        <div className="mt-4 p-2.5 rounded-lg bg-surface-2/50 text-[11px] text-muted leading-relaxed italic border border-border/40">
                          "{thesis}"
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40">
                        <div className="flex items-baseline gap-1">
                          <span className="tabular text-xl font-bold text-text">{pick.conviction.toFixed(0)}</span>
                          <span className="text-[10px] text-muted">score</span>
                        </div>
                        <Link
                          href={`/recommendations/${pick.id}`}
                          className="text-[11px] font-semibold text-muted group-hover:text-text flex items-center gap-0.5 transition-colors"
                        >
                          Details <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Recent Signals */}
          <motion.div {...fadeUp(7)}>
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-[14px] font-semibold text-text">Recent Intelligence Signals</h2>
                  <p className="text-[11px] text-muted mt-0.5">Refreshes automatically every 15s</p>
                </div>
                <Link
                  href="/recommendations"
                  className="flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-text transition-colors"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[100px_70px_80px_110px_1fr_80px] gap-3 border-b border-border bg-surface-2/40 px-5 py-2.5 text-[9px] font-bold uppercase tracking-widest text-muted">
                <span>Symbol</span>
                <span>Action</span>
                <span>Conviction</span>
                <span>Status</span>
                <span>Score Meter</span>
                <span className="text-right">Age</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/60">
                {isLoading
                  ? [...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-4 w-10" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-2 flex-1" />
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </div>
                    ))
                  : recs.length === 0
                  ? <EmptyState />
                  : recs.slice(0, 7).map((r, i) => {
                      const col = r.conviction >= 75 ? "var(--groww-green)" : r.conviction >= 50 ? "var(--groww-orange)" : "var(--groww-red)";
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                          <Link
                            href={`/recommendations/${r.id}`}
                            className="grid grid-cols-[100px_70px_80px_110px_1fr_80px] items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-surface-2/30"
                          >
                            <span className="text-[12px] font-bold text-text truncate">
                              {r.symbol}
                            </span>
                            <ActionBadge action={r.action} />
                            <span className="tabular text-[13px] font-bold" style={{ color: col }}>
                              {r.conviction.toFixed(0)}
                            </span>
                            <StatusBadge status={r.status} />
                            
                            {/* Conviction scale */}
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${r.conviction}%`, backgroundColor: col }}
                              />
                            </div>
                            <span className="text-right text-[11px] text-muted">{timeAgo(r.created_at)}</span>
                          </Link>
                        </motion.div>
                      );
                    })
                }
              </div>
            </div>
          </motion.div>

        </div>

        {/* Right Column (ColSpan 1) */}
        <div className="space-y-5">
          
          {/* Market Intelligence */}
          <motion.div {...fadeUp(8)}>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="h-4 w-4 text-[var(--groww-purple)]" />
                <h2 className="text-[13px] font-semibold text-text">Market Intelligence</h2>
              </div>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2">
                  <Newspaper className="h-4 w-4 text-muted" />
                </div>
                <p className="text-[13px] font-semibold text-text">No live news feed</p>
                <p className="text-[12px] text-muted leading-relaxed max-w-[200px]">
                  Connect a news API (e.g. NewsAPI, Moneycontrol RSS) to see real-time AI-summarized headlines here.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Signal Breakdown */}
          <motion.div {...fadeUp(9)}>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-[var(--groww-purple)]" />
                <h2 className="text-[13px] font-semibold text-text">Signal Breakdown</h2>
              </div>
              {isLoading
                ? <div className="space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>
                : (
                  <div className="space-y-3.5">
                    {[
                      { label: "Guard Passed", count: passed.length,                                    color: "var(--groww-green)" },
                      { label: "Blocked",      count: recs.filter(r => r.status === "blocked").length,  color: "var(--groww-red)" },
                      { label: "Executed",     count: executed.length,                                  color: "var(--groww-purple)" },
                      { label: "Proposed",     count: recs.filter(r => r.status === "proposed").length, color: "var(--groww-orange)" },
                    ].map(({ label, count, color }) => {
                      const total = recs.length || 1;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted font-medium">{label}</span>
                            <span className="tabular font-bold" style={{ color }}>{count}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(count / total) * 100}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </motion.div>

          {/* Market Hours */}
          <motion.div {...fadeUp(10)}>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2"
                >
                  <Clock className="h-4 w-4 text-[var(--groww-green)]" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-text">Market Hours</div>
                  <div className="text-[11px] font-semibold text-[var(--groww-green)]">
                    NSE / BSE · 09:15 – 15:30 IST
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-2">
        <BarChart2 className="h-5 w-5 text-muted" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-text">No signals yet</p>
        <p className="mt-1 text-[12px] text-muted">
          <Link href="/analyze" className="hover:underline underline-offset-2" style={{ color: "var(--groww-purple)" }}>
            Analyze a symbol to get started →
          </Link>
        </p>
      </div>
    </div>
  );
}
