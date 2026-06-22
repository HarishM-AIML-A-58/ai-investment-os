"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  History, Play, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  BookOpen, BarChart3, Loader2, CheckCircle2, XCircle, Minus,
  CalendarRange, Target,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { BacktestRun } from "@/lib/types";

/* ── helpers ─────────────────────────────────────────────────── */
function fmt(v: number | null | undefined, decimals = 2, suffix = "%") {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}${suffix}`;
}
function returnColor(v: number | null | undefined) {
  if (v == null) return "var(--text)";
  return v > 0 ? "#00d09c" : v < 0 ? "#eb3b5a" : "#888";
}
function outcomeColor(o: string | null) {
  if (!o) return "#888";
  if (o === "win") return "#00d09c";
  if (o === "loss") return "#eb3b5a";
  return "#f89c23";
}
function shortDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

/* ── cumulative equity curve ─────────────────────────────────── */
function buildEquityCurve(runs: BacktestRun[]) {
  const sorted = [...runs]
    .filter(r => r.raw_return_pct != null && r.nifty50_return_pct != null)
    .sort((a, b) => a.backtest_date.localeCompare(b.backtest_date));

  let strat = 100;
  let bench = 100;
  return sorted.map(r => {
    strat = strat * (1 + (r.raw_return_pct ?? 0) / 100);
    bench = bench * (1 + (r.nifty50_return_pct ?? 0) / 100);
    return {
      date: shortDate(r.backtest_date),
      Strategy: parseFloat(strat.toFixed(2)),
      NIFTY50: parseFloat(bench.toFixed(2)),
    };
  });
}

/* ── expandable run row ─────────────────────────────────────── */
function RunRow({ run }: { run: BacktestRun }) {
  const [open, setOpen] = React.useState(false);
  const rc = returnColor(run.alpha_pct);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="grid w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/30 transition-colors"
        style={{ gridTemplateColumns: "105px 72px 80px 105px 105px 90px 80px 60px 24px" }}
      >
        {/* Date */}
        <span className="text-[12px] font-semibold text-text tabular">{shortDate(run.backtest_date)}</span>

        {/* Action */}
        {run.signal ? (
          <span
            className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded"
            style={{
              background: run.signal.toLowerCase() === "buy" ? "rgba(0,208,156,.12)" : "rgba(235,59,90,.12)",
              color: run.signal.toLowerCase() === "buy" ? "#00d09c" : "#eb3b5a",
            }}
          >
            {run.signal.toUpperCase()}
          </span>
        ) : <span className="text-muted text-[11px]">—</span>}

        {/* Conviction */}
        <span className="text-[12px] font-bold tabular" style={{ color: run.conviction != null && run.conviction >= 70 ? "#00d09c" : run.conviction != null && run.conviction >= 50 ? "#f89c23" : "#eb3b5a" }}>
          {run.conviction != null ? `${run.conviction.toFixed(0)}` : "—"}
        </span>

        {/* Entry / Exit */}
        <span className="text-[11px] text-muted tabular">
          {run.entry_price != null ? `₹${run.entry_price.toFixed(1)}` : "—"}
          {" → "}
          {run.exit_price != null ? `₹${run.exit_price.toFixed(1)}` : "—"}
        </span>

        {/* Return / Alpha */}
        <div className="text-[11px] tabular">
          <span style={{ color: returnColor(run.raw_return_pct) }}>{fmt(run.raw_return_pct)}</span>
          <span className="text-muted mx-1">/</span>
          <span style={{ color: rc }}>{fmt(run.alpha_pct)}</span>
        </div>

        {/* Outcome */}
        <div className="flex items-center gap-1.5">
          {run.outcome === "win" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#00d09c" }} />
          ) : run.outcome === "loss" ? (
            <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#eb3b5a" }} />
          ) : (
            <Minus className="h-3.5 w-3.5 shrink-0 text-muted" />
          )}
          <span className="text-[11px] font-medium" style={{ color: outcomeColor(run.outcome) }}>
            {run.outcome ? run.outcome.charAt(0).toUpperCase() + run.outcome.slice(1) : "—"}
          </span>
        </div>

        {/* Status */}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
          style={{
            borderColor: run.status === "completed" ? "rgba(0,208,156,.3)" : "rgba(248,156,35,.3)",
            color: run.status === "completed" ? "#00d09c" : "#f89c23",
            background: run.status === "completed" ? "rgba(0,208,156,.06)" : "rgba(248,156,35,.06)",
          }}
        >
          {run.status}
        </span>

        {/* Expand chevron */}
        <span className="flex justify-center text-muted">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {/* Expanded: LLM reflection */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 border-t border-border/40 bg-surface-2/20">
              {run.llm_reflection ? (
                <div className="flex gap-3">
                  <div
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-[10px] font-bold"
                    style={{ background: "rgba(103,71,245,.12)", color: "var(--groww-purple)" }}
                  >
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">LLM Reflection</div>
                    <p className="text-[12px] text-muted leading-relaxed">{run.llm_reflection}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-muted italic">No reflection available for this run.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Custom recharts tooltip ─────────────────────────────────── */
function EquityTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 shadow-xl text-[12px]">
      <div className="text-muted font-semibold mb-1.5">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-bold tabular" style={{ color: p.color }}>{p.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function BacktestPage() {
  const [symbol, setSymbol] = React.useState("");
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [frequency, setFrequency] = React.useState("weekly");
  const [holdingDays, setHoldingDays] = React.useState(20);
  const [activeSymbol, setActiveSymbol] = React.useState<string | null>(null);
  const [showSug, setShowSug] = React.useState(false);

  /* Watchlist for symbol autocomplete */
  const { data: watchlist } = useQuery({
    queryKey: ["watchlist"],
    queryFn: api.listWatchlist,
  });
  const watchlistSymbols = (watchlist ?? []).map(w => w.symbol);
  const filteredSuggestions = symbol.length > 0
    ? watchlistSymbols.filter(s => s.toUpperCase().startsWith(symbol.toUpperCase())).slice(0, 6)
    : watchlistSymbols.slice(0, 6);

  /* Backtest data queries — only fire when activeSymbol is set */
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["backtest-stats", activeSymbol],
    queryFn: () => api.getBacktestStats(activeSymbol!),
    enabled: !!activeSymbol,
  });
  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ["backtest-runs", activeSymbol],
    queryFn: () => api.getBacktestRuns(activeSymbol!, 100),
    enabled: !!activeSymbol,
  });
  const { data: lessons } = useQuery({
    queryKey: ["backtest-lessons", activeSymbol],
    queryFn: () => api.getBacktestLessons(activeSymbol!, 10),
    enabled: !!activeSymbol,
  });

  const equityCurve = React.useMemo(() => (runs ? buildEquityCurve(runs) : []), [runs]);

  /* Submit mutation */
  const run = useMutation({
    mutationFn: () =>
      api.runBacktest({
        symbol: symbol.trim().toUpperCase(),
        start_date: startDate,
        end_date: endDate,
        holding_days: holdingDays,
        frequency,
      }),
    onSuccess: (data) => {
      const sym = symbol.trim().toUpperCase();
      setActiveSymbol(sym);
      toast.success(`Queued ${data.queued} backtest run${data.queued !== 1 ? "s" : ""} for ${sym}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) return;
    run.mutate();
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Backtesting Engine"
        subtitle="Run historical simulations of the AI thesis pipeline and measure strategy alpha vs NIFTY50."
      />

      {/* ── Form + quick-load row ───────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarRange className="h-4 w-4" style={{ color: "var(--groww-purple)" }} />
          <span className="text-[13px] font-bold text-text">Run New Backtest</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
            {/* Symbol */}
            <div className="relative lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Symbol</label>
              <input
                value={symbol}
                onChange={e => { setSymbol(e.target.value.toUpperCase()); setShowSug(true); }}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="HDFCBANK"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] font-semibold text-text outline-none focus:border-[var(--groww-purple)] transition-colors placeholder:text-muted/40"
              />
              <AnimatePresence>
                {showSug && filteredSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full mt-1 left-0 right-0 rounded-xl border border-border bg-surface z-50 overflow-hidden shadow-lg"
                  >
                    {filteredSuggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={() => { setSymbol(s); setShowSug(false); }}
                        className="w-full px-3 py-2 text-[12px] font-semibold text-text text-left hover:bg-surface-2 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none focus:border-[var(--groww-purple)] transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none focus:border-[var(--groww-purple)] transition-colors"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none focus:border-[var(--groww-purple)] transition-colors"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Holding Period */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Holding Days</label>
              <select
                value={holdingDays}
                onChange={e => setHoldingDays(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none focus:border-[var(--groww-purple)] transition-colors"
              >
                <option value={10}>10 days</option>
                <option value={20}>20 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!symbol.trim() || run.isPending}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#6747f5,#00a3ff)" }}
            >
              {run.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Queuing…</>
              ) : (
                <><Play className="h-4 w-4" />Run Backtest</>
              )}
            </button>

            {activeSymbol && (
              <span className="text-[12px] text-muted">
                Viewing results for <span className="font-bold text-text">{activeSymbol}</span>
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* ── Stats + results ─────────────────────────────────── */}
      {activeSymbol && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Summary metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Total Runs"
              value={statsLoading ? "…" : String(stats?.total_runs ?? 0)}
              hint="Completed simulations"
              tone="var(--groww-purple)"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <Stat
              label="Win Rate"
              value={statsLoading ? "…" : `${((stats?.win_rate ?? 0) * 100).toFixed(1)}%`}
              hint={stats ? `${stats.wins}W / ${stats.losses}L` : ""}
              tone={stats ? (stats.win_rate >= 0.5 ? "#00d09c" : "#eb3b5a") : undefined}
              icon={stats && stats.win_rate >= 0.5
                ? <TrendingUp className="h-4 w-4" />
                : <TrendingDown className="h-4 w-4" />
              }
            />
            <Stat
              label="Avg Raw Return"
              value={statsLoading ? "…" : fmt(stats?.avg_raw_return)}
              hint="Mean return per run"
              tone={stats ? returnColor(stats.avg_raw_return) : undefined}
              icon={<Target className="h-4 w-4" />}
            />
            <Stat
              label="Avg Alpha"
              value={statsLoading ? "…" : fmt(stats?.avg_alpha)}
              hint="vs NIFTY50 baseline"
              tone={stats ? returnColor(stats.avg_alpha) : undefined}
              icon={<History className="h-4 w-4" />}
            />
          </div>

          {/* Equity curve */}
          {equityCurve.length > 1 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4" style={{ color: "var(--groww-purple)" }} />
                <span className="text-[13px] font-bold text-text">Performance Equity Curve</span>
                <span className="text-[11px] text-muted ml-1">Cumulative returns (base = 100)</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={equityCurve} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--muted)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v.toFixed(0)}
                  />
                  <Tooltip content={<EquityTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="Strategy"
                    stroke="#6747f5"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="NIFTY50"
                    stroke="#888899"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Runs history table */}
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-3.5 flex items-center gap-2">
              <History className="h-4 w-4" style={{ color: "var(--groww-purple)" }} />
              <span className="text-[13px] font-bold text-text">Run History</span>
              {runs && <span className="text-[11px] text-muted ml-1">{runs.length} records</span>}
            </div>

            {/* Table header */}
            <div
              className="grid items-center gap-3 border-b border-border bg-surface-2/40 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted"
              style={{ gridTemplateColumns: "105px 72px 80px 105px 105px 90px 80px 60px 24px" }}
            >
              <span>Date</span>
              <span>Signal</span>
              <span>Conviction</span>
              <span>Entry → Exit</span>
              <span>Return / Alpha</span>
              <span>Outcome</span>
              <span>Status</span>
              <span></span>
              <span></span>
            </div>

            {runsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[13px]">Loading runs…</span>
              </div>
            ) : !runs || runs.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-center">
                <BarChart3 className="h-7 w-7 text-muted" />
                <p className="text-[13px] font-semibold text-text">No runs yet</p>
                <p className="text-[12px] text-muted">Submit a backtest above to start generating data.</p>
              </div>
            ) : (
              <div>
                {runs.map(r => <RunRow key={r.id} run={r} />)}
              </div>
            )}
          </Card>

          {/* Past lessons */}
          {lessons && lessons.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4" style={{ color: "#f89c23" }} />
                <span className="text-[13px] font-bold text-text">AI Past Lessons</span>
                <span className="text-[11px] text-muted ml-1">Synthesized from completed runs</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {lessons.map(l => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-border bg-bg p-4 relative overflow-hidden"
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-[2px]"
                      style={{ background: returnColor(l.alpha_pct) }}
                    />
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        {new Date(l.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                      </span>
                      {l.alpha_pct != null && (
                        <span
                          className="text-[11px] font-bold tabular px-2 py-0.5 rounded-full"
                          style={{
                            background: `${returnColor(l.alpha_pct)}18`,
                            color: returnColor(l.alpha_pct),
                          }}
                        >
                          α {fmt(l.alpha_pct)}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted leading-relaxed">{l.lesson}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* Empty state when nothing is loaded */}
      {!activeSymbol && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "rgba(103,71,245,.1)", border: "2px solid rgba(103,71,245,.2)" }}
          >
            <History className="h-6 w-6" style={{ color: "var(--groww-purple)" }} />
          </div>
          <p className="text-[15px] font-bold text-text mb-1">No symbol selected</p>
          <p className="text-[13px] text-muted max-w-sm">
            Enter an NSE symbol in the form above and click <strong>Run Backtest</strong> to queue historical simulations.
          </p>
        </div>
      )}
    </div>
  );
}
