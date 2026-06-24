"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ArrowRight, CheckCircle2, XCircle, TrendingUp,
  Zap, ShieldCheck, ShieldAlert, Loader2, DollarSign,
  Search, Flame, RefreshCw, X, Activity, Clock,
  MessageSquare, FileText,
} from "lucide-react";
import { ActionBadge, StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { inr, timeAgo } from "@/lib/format";
import type { DecisionOutcome, RecommendationDetail } from "@/lib/types";


const SECTOR_MAP: Record<string, string> = {
  HDFCBANK: "Banking", ICICIBANK: "Banking", KOTAKBANK: "Banking",
  TCS: "IT", WIPRO: "IT", INFY: "IT", TECHM: "IT",
  RELIANCE: "Energy", ONGC: "Energy",
  BAJFINANCE: "NBFC",
  TITAN: "FMCG", MARUTI: "Auto",
  SUNPHARMA: "Pharma", DRREDDY: "Pharma",
};
const AGENT_COLORS = ["#6747f5","#f89c23","#00d09c","#00a3ff","#00bfa5","#eb3b5a"];
const AGENTS = ["Fundamental","Technical","News","Sector","Institutional","Risk"];

/* ── Debate transcript parser ────────────────────────────────── */
type DebateMessage = { speaker: string; side: "bull" | "bear" | "manager" | "other"; text: string };

function parseDebateTranscript(transcript: string): DebateMessage[] {
  const lines = transcript.split(/\n+/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const m = line.match(/^(Bull|Bear|Research Manager|Manager):?\s*/i);
    if (!m) return { speaker: "", side: "other" as const, text: line };
    const speaker = m[1];
    const text = line.slice(m[0].length);
    const side = /bull/i.test(speaker) ? "bull" as const
      : /bear/i.test(speaker) ? "bear" as const
      : "manager" as const;
    return { speaker, side, text };
  });
}


function convColor(v: number) {
  if (v >= 75) return "#00d09c";
  if (v >= 50) return "#f89c23";
  return "#eb3b5a";
}

/* ── Main page ─────────────────────────────────────────────── */
export default function AnalyzePage() {
  const [searchVal,    setSearchVal]    = React.useState("");
  const [suggestions,  setSuggestions]  = React.useState<string[]>([]);
  const [showSug,      setShowSug]      = React.useState(false);
  const [activeSymbol, setActiveSymbol] = React.useState<string | null>(null);
  const [activeSector, setActiveSector] = React.useState("IT");
  const [result,       setResult]       = React.useState<DecisionOutcome | null>(null);
  const [panelOpen,    setPanelOpen]    = React.useState(false);
  const [activeTab,    setActiveTab]    = React.useState<"summary" | "debate">("summary");
  const searchRef = React.useRef<HTMLInputElement>(null);

  /* Fetch full recommendation detail for debate tab */
  const { data: recDetail } = useQuery<RecommendationDetail>({
    queryKey: ["recommendation", result?.recommendation_id],
    queryFn: () => api.getRecommendation(result!.recommendation_id),
    enabled: !!result?.recommendation_id,
  });

  /* Recommendations — top picks + recently analyzed strip */
  const { data: allRecs, isLoading: recsLoading } = useQuery({
    queryKey: ["recommendations", 20],
    queryFn: () => api.listRecommendations(20),
    refetchInterval: 30_000,
  });

  /* Real-time sector indices from Yahoo Finance */
  const { data: sectorData, isLoading: sectorsLoading } = useQuery({
    queryKey: ["sector-pulse"],
    queryFn: () => fetch("/api/sectors").then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const topPicks = React.useMemo(() => {
    return [...(allRecs ?? [])]
      .filter((r) => r.action.toLowerCase() === "buy" || r.action.toLowerCase() === "hold")
      .sort((a, b) => b.conviction - a.conviction)
      .slice(0, 6);
  }, [allRecs]);

  const recents = allRecs;

  const run = useMutation({
    mutationFn: (params: { symbol: string; sector: string }) =>
      api.decide({
        symbol: params.symbol,
        exchange: "NSE",
        sector: params.sector,
        side: "buy",
        context: "",
        policy: {
          monthly_budget: "50000",
          max_position_pct: 20,
          max_sector_pct: 30,
          min_conviction: 60,
          cash_reserve_pct: 20,
          auto_execute: false,
          autonomy_tier: 0,
        },
        account: {
          total_capital: "500000",
          cash_available: "500000",
          sector_exposure: "0",
          month_to_date_spend: "0",
        },
        market: {
          market_open: true,
          avg_daily_value: "50000000",
          trades_today: 0,
          deployed_today: "0",
          kill_switch: false,
        },
      }),
    onSuccess: (d) => {
      setResult(d);
      toast.success(`${activeSymbol} · ${d.action} · Conviction ${d.conviction.toFixed(0)}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function analyze(symbol: string, sector?: string) {
    const s = sector ?? SECTOR_MAP[symbol] ?? "IT";
    setActiveSymbol(symbol);
    setActiveSector(s);
    setPanelOpen(true);
    setResult(null);
    setActiveTab("summary");
    run.mutate({ symbol, sector: s });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const sym = searchVal.trim().toUpperCase();
    if (!sym) return;
    setShowSug(false);
    setSearchVal("");
    analyze(sym);
  }

  function handleSearchInput(val: string) {
    setSearchVal(val.toUpperCase());
    const v = val.toUpperCase();
    if (v.length >= 1) {
      const pool = [...new Set([...Object.keys(SECTOR_MAP), ...(allRecs ?? []).map(r => r.symbol)])];
      const matches = pool.filter(s => s.startsWith(v)).slice(0, 6);
      setSuggestions(matches);
      setShowSug(matches.length > 0);
    } else {
      setShowSug(false);
    }
  }

  const col = result ? convColor(result.conviction) : "#6747f5";

  return (
    /* Full-bleed wrapper — removes parent padding so header can span edge-to-edge */
    <div className="-mx-6 -mt-6 flex flex-col" style={{ minHeight: "calc(100vh - 88px)" }}>

      {/* ── Hero search header ─────────────────────────────── */}
      <div
        className="shrink-0 border-b border-border px-6 pt-7 pb-5"
        style={{ background: "linear-gradient(180deg, var(--surface-2) 0%, var(--bg) 100%)" }}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "linear-gradient(135deg,#6747f5,#00a3ff)" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--groww-purple)" }}>
                AI Market Intelligence
              </span>
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-text">Top Picks &amp; Analysis</h1>
            <p className="mt-1 text-[13px] text-muted max-w-md">
              AI-curated trending stocks, chart patterns, and on-demand 6-agent thesis.
            </p>
          </div>

          {/* Search bar */}
          <div className="shrink-0 w-full sm:w-[340px]">
            <form onSubmit={handleSearch} className="relative">
              <div
                className="flex items-center gap-2 rounded-xl border-2 bg-surface px-4 py-3 transition-all"
                style={{ borderColor: searchVal ? "var(--groww-purple)" : "var(--border)" }}
              >
                <Search className="h-4 w-4 shrink-0 text-muted" />
                <input
                  ref={searchRef}
                  value={searchVal}
                  onChange={e => handleSearchInput(e.target.value)}
                  onFocus={() => searchVal && setShowSug(suggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSug(false), 150)}
                  placeholder="Search NSE symbol — TCS, HDFC…"
                  className="flex-1 bg-transparent text-[14px] font-semibold text-text placeholder:text-muted/50 outline-none"
                />
                {searchVal && (
                  <button type="button" onClick={() => { setSearchVal(""); setShowSug(false); }}>
                    <X className="h-3.5 w-3.5 text-muted hover:text-text" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!searchVal.trim() || run.isPending}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50 transition-all shrink-0"
                  style={{ background: "linear-gradient(135deg,#6747f5,#00a3ff)" }}
                >
                  {run.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Analyze
                </button>
              </div>

              {/* Autocomplete */}
              <AnimatePresence>
                {showSug && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full mt-2 left-0 right-0 rounded-xl border border-border bg-surface z-50 overflow-hidden"
                    style={{ boxShadow: "0 8px 32px -8px rgba(0,0,0,0.25)" }}
                  >
                    {suggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={() => { setSearchVal(s); setShowSug(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold hover:bg-surface-2 transition-colors text-left"
                      >
                        <span className="text-text">{s}</span>
                        <span className="text-[11px] font-medium text-muted">{SECTOR_MAP[s] ?? "—"}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
            <p className="mt-2 text-[11px] text-center text-muted">Any NSE/BSE symbol · Enter to run 6-agent analysis</p>
          </div>
        </div>
      </div>

      {/* ── Content + side result panel ─────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Main scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

          {/* Top conviction picks from real AI analysis */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4" style={{ color: "#f89c23" }} />
                <span className="text-[13px] font-bold text-text">Top AI Conviction Picks</span>
                {!recsLoading && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{ color: "var(--groww-green)", borderColor: "rgba(0,208,156,.3)", background: "rgba(0,208,156,.08)" }}
                  >
                    Live · {topPicks.length} pick{topPicks.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div
                className="grid items-center gap-2 border-b border-border bg-surface-2/60 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted"
                style={{ gridTemplateColumns: "28px 160px 88px 1fr 110px" }}
              >
                <span>#</span>
                <span>Symbol</span>
                <span>Conviction</span>
                <span>AI Thesis</span>
                <span className="text-right">Action</span>
              </div>

              {recsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-7 w-20" />
                  </div>
                ))
              ) : topPicks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Sparkles className="h-8 w-8 text-muted opacity-40" />
                  <p className="text-[13px] font-semibold text-text">No picks yet</p>
                  <p className="text-[12px] text-muted">Analyze symbols above to generate AI conviction picks</p>
                </div>
              ) : (
                topPicks.map((rec, i) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <RecRow
                      rec={rec}
                      rank={i + 1}
                      isActive={activeSymbol === rec.symbol}
                      isLoading={run.isPending && activeSymbol === rec.symbol}
                      onAnalyze={() => analyze(rec.symbol, SECTOR_MAP[rec.symbol] ?? "IT")}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Live sector pulse from NSE indices */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-muted" />
              <span className="text-[13px] font-bold text-text">Sector Pulse</span>
              <span className="text-[10px] text-muted">Live · NSE indices</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sectorsLoading
                ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-7 w-28 rounded-full" />)
                : (sectorData ?? []).map((s: { label: string; changePct: number; up: boolean }) => {
                    const color = s.up ? "#00d09c" : "#eb3b5a";
                    const mood = s.changePct >= 0.5 ? "Bullish" : s.changePct <= -0.5 ? "Bearish" : "Neutral";
                    return (
                      <div
                        key={s.label}
                        className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]"
                        style={{ borderColor: `${color}30`, background: `${color}08` }}
                      >
                        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="font-semibold text-text">{s.label}</span>
                        <span className="font-semibold tabular" style={{ color }}>
                          {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                        </span>
                        <span className="text-muted">{mood}</span>
                      </div>
                    );
                  })
              }
            </div>
          </section>

          {/* Recently analyzed */}
          {recents && recents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted" />
                <span className="text-[13px] font-bold text-text">Recently Analyzed</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recents.slice(0, 8).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => analyze(r.symbol, SECTOR_MAP[r.symbol] ?? "IT")}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] hover:bg-surface-2 hover:border-border-2 transition-all"
                  >
                    <span className="font-bold text-text">{r.symbol}</span>
                    <span className="text-muted">{timeAgo(r.created_at)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Result panel — slides in from right ─────────────── */}
        <AnimatePresence>
          {panelOpen && (
            <motion.aside
              key="result-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16,1,0.3,1] }}
              className="shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden"
            >
              <div className="w-[340px] flex flex-col h-full overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-bold text-text">{activeSymbol}</span>
                      {run.isPending && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--groww-purple)" }} />
                      )}
                    </div>
                    <div className="text-[11px] text-muted">{activeSector} · NSE · 6-Agent Analysis</div>
                  </div>
                  <button
                    onClick={() => { setPanelOpen(false); setResult(null); setActiveSymbol(null); }}
                    className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
                  >
                    <X className="h-4 w-4 text-muted" />
                  </button>
                </div>

                {/* Tab strip — only shown when result is available */}
                {result && (
                  <div className="flex border-b border-border shrink-0">
                    {(["summary", "debate"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-all ${
                          activeTab === tab
                            ? "border-[var(--groww-purple)] text-[var(--groww-purple)]"
                            : "border-transparent text-muted hover:text-text"
                        }`}
                      >
                        {tab === "summary"
                          ? <><FileText className="h-3.5 w-3.5" />Summary</>
                          : <><MessageSquare className="h-3.5 w-3.5" />Debate &amp; Plan</>
                        }
                      </button>
                    ))}
                  </div>
                )}

                {/* Panel body */}
                <div className="flex-1 overflow-y-auto p-5">
                  <AnimatePresence mode="wait">
                    {run.isPending ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {/* Animated loading state */}
                        <div className="text-center py-5 mb-4">
                          <div
                            className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-3"
                            style={{ background: "rgba(103,71,245,.1)", border: "2px solid rgba(103,71,245,.2)" }}
                          >
                            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--groww-purple)" }} />
                          </div>
                          <div className="text-[11px] font-bold uppercase tracking-widest text-muted">
                            Running Pipeline
                          </div>
                        </div>
                        <div className="space-y-2">
                          {AGENTS.map((a, i) => (
                            <motion.div
                              key={a}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.3 }}
                              className="flex items-center gap-3 rounded-lg border border-border bg-bg p-3"
                            >
                              <div
                                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-[9px] font-bold"
                                style={{ background: `${AGENT_COLORS[i]}18`, color: AGENT_COLORS[i] }}
                              >
                                {a[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold text-text">{a}</div>
                                <div className="text-[10px] text-muted">Analyzing {activeSymbol}…</div>
                              </div>
                              <Loader2 className="h-3 w-3 animate-spin shrink-0" style={{ color: AGENT_COLORS[i] }} />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                    ) : result && activeTab === "debate" ? (
                      <motion.div key="debate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <DebatePanel detail={recDetail ?? null} />
                      </motion.div>

                    ) : result ? (
                      <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Conviction hero */}
                        <div className="rounded-xl border border-border bg-bg overflow-hidden">
                          <div className="relative px-5 py-6 text-center overflow-hidden">
                            <div
                              className="pointer-events-none absolute inset-0 opacity-[0.07]"
                              style={{ background: `radial-gradient(ellipse at 50% 0%, ${col} 0%, transparent 70%)` }}
                            />
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                              Conviction Score
                            </div>
                            <div
                              className="tabular text-[56px] font-bold leading-none"
                              style={{ color: col }}
                            >
                              {result.conviction.toFixed(0)}
                            </div>
                            <div className="text-[10px] text-muted mt-1 mb-3">out of 100</div>
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <ActionBadge action={result.action} />
                              <StatusBadge status={result.status} />
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${result.conviction}%` }}
                                transition={{ duration: 1.2, ease: [0.16,1,0.3,1] }}
                                style={{ background: col }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Meta grid 2x2 */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Target", value: inr(result.target_value), icon: DollarSign, color: "#6747f5" },
                            {
                              label: "Policy",
                              value: result.policy_allowed === null ? "N/A" : result.policy_allowed ? "Allowed" : "Blocked",
                              icon: result.policy_allowed ? ShieldCheck : ShieldAlert,
                              color: result.policy_allowed ? "#00d09c" : "#eb3b5a",
                            },
                            {
                              label: "Guard",
                              value: result.guard_passed ? "Passed" : "Failed",
                              icon: result.guard_passed ? CheckCircle2 : XCircle,
                              color: result.guard_passed ? "#00d09c" : "#eb3b5a",
                            },
                            {
                              label: "Auto-exec",
                              value: result.can_auto_execute ? "Eligible" : "No",
                              icon: result.can_auto_execute ? Zap : ShieldAlert,
                              color: result.can_auto_execute ? "#ffd234" : "#888",
                            },
                          ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="rounded-xl border border-border bg-bg p-3">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Icon className="h-3 w-3 shrink-0" style={{ color }} />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted">{label}</span>
                              </div>
                              <div className="text-[14px] font-bold" style={{ color }}>{value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Agent summary */}
                        <div className="rounded-xl border border-border bg-bg overflow-hidden">
                          <div className="px-4 py-3 border-b border-border">
                            <span className="text-[11px] font-bold text-text">Agent Verdicts</span>
                          </div>
                          <div className="divide-y divide-border/50">
                            {AGENTS.map((a, i) => (
                              <div key={a} className="flex items-center gap-3 px-4 py-2.5">
                                <div
                                  className="h-6 w-6 shrink-0 flex items-center justify-center rounded-lg text-[9px] font-bold"
                                  style={{ background: `${AGENT_COLORS[i]}18`, color: AGENT_COLORS[i] }}
                                >
                                  {a[0]}
                                </div>
                                <span className="flex-1 text-[11px] font-medium text-muted">{a}</span>
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#00d09c" }} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTAs */}
                        <Link
                          href={`/recommendations/${result.recommendation_id}`}
                          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-bg px-4 py-3 text-[13px] font-semibold text-text hover:bg-surface-2 transition-colors"
                        >
                          <TrendingUp className="h-4 w-4 shrink-0" style={{ color: "var(--groww-purple)" }} />
                          Open Full Thesis
                          <ArrowRight className="h-3.5 w-3.5 text-muted ml-auto shrink-0" />
                        </Link>

                        <button
                          onClick={() => analyze(activeSymbol!, activeSector)}
                          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-muted hover:text-text hover:bg-surface-2 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Re-run Analysis
                        </button>
                      </motion.div>

                    ) : (
                      <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-surface-2 border border-border mb-3">
                          <Sparkles className="h-5 w-5 text-muted" />
                        </div>
                        <p className="text-[13px] font-semibold text-text">Ready to analyze</p>
                        <p className="text-[12px] text-muted mt-1">Select a stock above or search</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Debate & Plan panel ─────────────────────────────────────── */
function DebatePanel({ detail }: { detail: RecommendationDetail | null }) {
  if (!detail) {
    return (
      <div className="flex flex-col items-center py-10 gap-2 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
        <p className="text-[12px] text-muted">Loading debate transcript…</p>
      </div>
    );
  }

  const hasDebate = detail.debate_transcript && detail.debate_transcript.trim();
  const hasPlan = detail.investment_plan && detail.investment_plan.trim();

  if (!hasDebate && !hasPlan) {
    return (
      <div className="flex flex-col items-center py-10 gap-2 text-center">
        <MessageSquare className="h-7 w-7 text-muted" />
        <p className="text-[13px] font-semibold text-text">No debate recorded</p>
        <p className="text-[12px] text-muted">This analysis predates the debate layer or ran in stub mode.</p>
      </div>
    );
  }

  const messages = hasDebate ? parseDebateTranscript(detail.debate_transcript!) : [];

  const BUBBLE_STYLES: Record<string, { bg: string; color: string; align: string }> = {
    bull:    { bg: "rgba(0,208,156,.1)",  color: "#00d09c", align: "items-start" },
    bear:    { bg: "rgba(235,59,90,.1)",  color: "#eb3b5a", align: "items-end"   },
    manager: { bg: "rgba(103,71,245,.1)", color: "#6747f5", align: "items-center" },
    other:   { bg: "rgba(136,136,153,.08)", color: "#888", align: "items-start"  },
  };

  return (
    <div className="space-y-4">
      {/* Conviction adjustment badge */}
      {detail.conviction_adjustment != null && (
        <div
          className="rounded-lg border px-3 py-2 text-[12px] font-semibold"
          style={{
            borderColor: detail.conviction_adjustment >= 0 ? "rgba(0,208,156,.3)" : "rgba(235,59,90,.3)",
            background: detail.conviction_adjustment >= 0 ? "rgba(0,208,156,.06)" : "rgba(235,59,90,.06)",
            color: detail.conviction_adjustment >= 0 ? "#00d09c" : "#eb3b5a",
          }}
        >
          Debate adjustment: {detail.conviction_adjustment >= 0 ? "+" : ""}{detail.conviction_adjustment.toFixed(1)} pts
        </div>
      )}

      {/* Chat bubbles */}
      {messages.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Bull / Bear Debate</div>
          {messages.map((msg, i) => {
            const style = BUBBLE_STYLES[msg.side];
            return (
              <div key={i} className={`flex flex-col ${style.align}`}>
                {msg.speaker && (
                  <span className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: style.color, marginLeft: msg.side === "bear" ? 0 : undefined, marginRight: msg.side === "bear" ? 0 : undefined }}>
                    {msg.speaker}
                  </span>
                )}
                <div
                  className="rounded-xl px-3 py-2 text-[11px] leading-relaxed text-text max-w-[90%]"
                  style={{ background: style.bg, border: `1px solid ${style.color}20` }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Investment plan */}
      {hasPlan && (
        <div className="rounded-xl border border-border bg-bg p-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="h-6 w-6 shrink-0 flex items-center justify-center rounded-lg text-[9px] font-bold"
              style={{ background: "rgba(103,71,245,.12)", color: "#6747f5" }}
            >
              RM
            </div>
            <span className="text-[11px] font-bold text-text">Research Manager Plan</span>
          </div>
          <p className="text-[12px] text-muted leading-relaxed whitespace-pre-wrap">{detail.investment_plan}</p>
        </div>
      )}
    </div>
  );
}

/* ── Real recommendation row ────────────────────────────────── */
function RecRow({
  rec, rank, isActive, isLoading, onAnalyze,
}: {
  rec: { id: string; symbol: string; action: string; conviction: number; created_at: string; thesis?: string | null };
  rank: number;
  isActive: boolean;
  isLoading: boolean;
  onAnalyze: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const cvCol = convColor(rec.conviction);
  const actionColor = rec.action.toLowerCase() === "buy" ? "#00d09c"
    : rec.action.toLowerCase() === "sell" ? "#eb3b5a" : "#f89c23";

  return (
    <div
      className={`border-b border-border last:border-0 transition-colors duration-150 ${
        isActive ? "bg-[rgba(103,71,245,0.05)]" : "hover:bg-surface-2/30"
      }`}
    >
      <div
        className="grid items-center gap-2 px-4 py-2.5"
        style={{ gridTemplateColumns: "28px 160px 88px 1fr 110px" }}
      >
        <span className="tabular text-[11px] font-bold text-muted text-center select-none">{rank}</span>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-[13px] font-bold text-text leading-none">{rec.symbol}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${actionColor}15`, color: actionColor }}>
              {rec.action.toUpperCase()}
            </span>
          </div>
          <div className="text-[10px] text-muted">{timeAgo(rec.created_at)}</div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${rec.conviction}%`, background: cvCol }} />
          </div>
          <span className="tabular text-[11px] font-bold shrink-0 w-6 text-right" style={{ color: cvCol }}>
            {rec.conviction.toFixed(0)}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] text-muted leading-snug truncate">
            {rec.thesis || "AI analysis complete · click to re-run"}
          </p>
          {rec.thesis && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-[9px] font-semibold transition-colors mt-0.5"
              style={{ color: "var(--groww-purple)" }}
            >
              {expanded ? "Hide ↑" : "Full thesis ↓"}
            </button>
          )}
        </div>

        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 shrink-0"
          style={{ background: isActive ? cvCol : "linear-gradient(135deg,#6747f5,#00a3ff)" }}
        >
          {isLoading ? (
            <><Loader2 className="h-3 w-3 animate-spin" />Running…</>
          ) : isActive ? (
            <><CheckCircle2 className="h-3 w-3" />Re-run</>
          ) : (
            <><Sparkles className="h-3 w-3" />Analyze</>
          )}
        </button>
      </div>

      <AnimatePresence>
        {expanded && rec.thesis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-12 pb-3.5 pt-1.5 border-t border-border/40">
              <p className="text-[12px] text-muted leading-relaxed max-w-2xl">{rec.thesis}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
