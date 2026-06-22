"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, Activity, Globe2, Search,
  Sparkles, ArrowRight, CheckCircle2, XCircle, TrendingUp,
  Zap, ShieldCheck, ShieldAlert, Loader2, DollarSign,
  RefreshCw, X
} from "lucide-react";
import { ActionBadge, StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import type { DecisionOutcome } from "@/lib/types";

const SECTORS = ["IT","Banking","FMCG","Pharma","Auto","Energy","Metals","Infra","Realty","Telecom","Gold/ETF","Other"];
const EXCHANGES = ["NSE","BSE"];

const SECTOR_COLORS: Record<string, string> = {
  IT: "#6747f5", Banking: "#00d09c", FMCG: "#f89c23",
  Pharma: "#00a3ff", Auto: "#00bfa5", Energy: "#eb3b5a",
  Metals: "#ffd234", Infra: "#4c6ef5", Realty: "#ff6b9d",
  Telecom: "#00d09c", "Gold/ETF": "#ffd234", Other: "#888888",
};

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

function convColor(v: number) {
  if (v >= 75) return "#00d09c";
  if (v >= 50) return "#f89c23";
  return "#eb3b5a";
}

const AGENT_COLORS = ["#6747f5", "#f89c23", "#00d09c", "#00a3ff", "#00bfa5", "#eb3b5a"];
const AGENTS = ["Fundamental", "Technical", "News", "Sector", "Institutional", "Risk"];

export default function WatchlistPage() {
  const qc = useQueryClient();
  const [symbol,   setSymbol]   = React.useState("");
  const [exchange, setExchange] = React.useState("NSE");
  const [sector,   setSector]   = React.useState("IT");
  const [search,   setSearch]   = React.useState("");

  const [activeSymbol, setActiveSymbol] = React.useState<string | null>(null);
  const [activeSector, setActiveSector] = React.useState("IT");
  const [result,       setResult]       = React.useState<DecisionOutcome | null>(null);
  const [panelOpen,    setPanelOpen]    = React.useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => api.listWatchlist(),
    refetchInterval: 30_000,
  });

  const { data: recs } = useQuery({
    queryKey: ["recommendations", 100],
    queryFn: () => api.listRecommendations(100),
    refetchInterval: 30_000,
  });

  const add = useMutation({
    mutationFn: () => api.addWatchlist({ symbol, exchange, sector: sector || undefined }),
    onSuccess: (newItem) => {
      toast.success(`${newItem.symbol} added to scanning universe`);
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      setSymbol("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (items ?? []).filter((i) =>
    search ? i.symbol.toLowerCase().includes(search.toLowerCase()) : true,
  );

  function analyze(sym: string, sec: string) {
    setActiveSymbol(sym);
    setActiveSector(sec);
    setPanelOpen(true);
    setResult(null);
    run.mutate({ symbol: sym, sector: sec });
  }

  const col = result ? convColor(result.conviction) : "#6747f5";

  return (
    <div className="-mx-6 -mt-6 flex flex-col animate-fade-up" style={{ minHeight: "calc(100vh - 88px)" }}>
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 pt-7 pb-5 bg-surface-2/40">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="h-4 w-4 text-[#00bfa5]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#00bfa5]">Watchlist</span>
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-text">Scanning Universe</h1>
        <p className="mt-1 text-[13px] text-muted">
          Securities the background AI scanner periodically sweeps for investment opportunities.
        </p>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
            {/* Add form */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden h-fit">
              <div className="border-b border-border bg-surface-2/50 px-5 py-4">
                <h2 className="text-[14px] font-semibold text-text">Add Security</h2>
                <p className="text-[11px] text-muted mt-0.5">Append to the scanning basket</p>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); if (symbol.trim()) add.mutate(); }}
                className="p-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Ticker Symbol</label>
                  <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. RELIANCE, TCS"
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14px] font-bold text-text placeholder:text-muted/40 focus:border-[#00bfa5]/60 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/15 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Exchange</label>
                    <select
                      value={exchange}
                      onChange={(e) => setExchange(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13px] text-text focus:border-[#00bfa5]/60 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/15 appearance-none cursor-pointer"
                    >
                      {EXCHANGES.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sector</label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13px] text-text focus:border-[#00bfa5]/60 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/15 appearance-none cursor-pointer"
                    >
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={add.isPending || !symbol.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00bfa5] py-2.5 text-[13px] font-bold text-black shadow-[0_2px_12px_rgba(64,203,224,0.3)] hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  {add.isPending ? "Adding…" : "Add to Universe"}
                </button>
              </form>

              {/* Universe count */}
              <div className="border-t border-border px-5 py-3 flex items-center gap-2">
                <Globe2 className="h-3.5 w-3.5 text-muted" />
                <span className="text-[11px] text-muted">
                  {items?.length ?? 0} securities in universe
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              {/* Search + header */}
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <h2 className="text-[14px] font-semibold text-text flex-1">Scanning Basket</h2>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5">
                  <Search className="h-3.5 w-3.5 text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter…"
                    className="w-28 bg-transparent text-[12px] text-text outline-none placeholder:text-muted/50"
                  />
                </div>
              </div>

              {/* Column headers */}
              <div
                className="grid items-center gap-3 border-b border-border bg-surface-2/30 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted"
                style={{ gridTemplateColumns: "150px 110px 85px 120px 100px 1fr 95px" }}
              >
                <span>Symbol</span>
                <span>Exchange</span>
                <span>Sector</span>
                <span>Action</span>
                <span>Conviction</span>
                <span>Status</span>
                <span className="text-right">Analyze</span>
              </div>

              {isLoading ? (
                <div className="space-y-px p-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <Activity className="h-8 w-8 text-muted" />
                  <p className="text-[13px] font-medium text-text">
                    {search ? "No matches" : "No securities yet"}
                  </p>
                  <p className="text-[12px] text-muted">
                    {search ? "Try a different ticker" : "Add your first symbol using the form"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  <AnimatePresence>
                    {filtered.map((item, i) => {
                      const sColor = SECTOR_COLORS[item.sector ?? "Other"] ?? "#888";
                      const latestRec = (recs ?? []).find(r => formatSecurity(r.security_id) === item.symbol);
                      const hasRec = !!latestRec;
                      const cvCol = hasRec ? convColor(latestRec.conviction) : "#888";

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`grid items-center gap-3 px-5 py-3.5 transition-colors border-b border-border/40 last:border-0 ${
                            activeSymbol === item.symbol ? "bg-[rgba(103,71,245,0.05)]" : "hover:bg-surface-2/40"
                          }`}
                          style={{ gridTemplateColumns: "150px 110px 85px 120px 100px 1fr 95px" }}
                        >
                          {/* Symbol */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                              style={{ backgroundColor: `${sColor}18`, color: sColor }}
                            >
                              {item.symbol.slice(0, 2)}
                            </div>
                            <span className="text-[14px] font-bold text-text truncate">{item.symbol}</span>
                          </div>

                          {/* Exchange */}
                          <span className="tabular text-[12px] font-semibold text-muted">{item.exchange}</span>

                          {/* Sector */}
                          <span>
                            {item.sector ? (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                style={{ backgroundColor: `${sColor}15`, color: sColor }}
                              >
                                {item.sector}
                              </span>
                            ) : (
                              <span className="text-[12px] text-muted">—</span>
                            )}
                          </span>

                          {/* Action Badge */}
                          <div>
                            {hasRec ? (
                              <ActionBadge action={latestRec.action} />
                            ) : (
                              <span className="text-[12px] text-muted">—</span>
                            )}
                          </div>

                          {/* Conviction */}
                          <div className="flex items-center gap-1.5">
                            {hasRec ? (
                              <>
                                <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${latestRec.conviction}%`, background: cvCol }} />
                                </div>
                                <span className="tabular text-[11px] font-bold shrink-0 w-6 text-right" style={{ color: cvCol }}>
                                  {latestRec.conviction.toFixed(0)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[12px] text-muted">—</span>
                            )}
                          </div>

                          {/* Status */}
                          <div>
                            {hasRec ? (
                              <StatusBadge status={latestRec.status} />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#00d09c] opacity-75 animate-ping" style={{ animationDuration: "2s" }} />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00d09c]" />
                                </span>
                                <span className="text-[11px] font-semibold text-[#00d09c]">Scanning</span>
                              </div>
                            )}
                          </div>

                          {/* Analyze CTA */}
                          <button
                            onClick={() => analyze(item.symbol, item.sector || "IT")}
                            disabled={run.isPending}
                            className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 shrink-0"
                            style={{
                              background: activeSymbol === item.symbol
                                ? cvCol
                                : "linear-gradient(135deg,#6747f5,#00a3ff)",
                            }}
                          >
                            {run.isPending && activeSymbol === item.symbol ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : activeSymbol === item.symbol ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            <span>Analyze</span>
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Result panel — slides in from right */}
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
