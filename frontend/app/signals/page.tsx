"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  List,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import type { FiiDiiData, RegimeData, WatchlistItem } from "@/lib/types";

// ── helpers ────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function regimeColor(regime: string) {
  if (regime === "bull") return "text-[var(--groww-green)]";
  if (regime === "bear") return "text-red-400";
  if (regime === "high_vol") return "text-orange-400";
  return "text-yellow-400";
}

function regimeBorder(regime: string) {
  if (regime === "bull") return "border-[var(--groww-green)]/30 bg-[var(--groww-green)]/5";
  if (regime === "bear") return "border-red-500/30 bg-red-500/5";
  if (regime === "high_vol") return "border-orange-400/30 bg-orange-400/5";
  return "border-yellow-400/30 bg-yellow-400/5";
}

function scoreColor(score: number) {
  if (score >= 68) return "bg-[var(--groww-green)]";
  if (score >= 42) return "bg-yellow-400";
  return "bg-red-400";
}

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-2">{label} <span className="opacity-50">({weight})</span></span>
        <span className="font-mono font-semibold text-text">{pct.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", scoreColor(pct))} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Regime widget ──────────────────────────────────────────────────────────

function RegimeWidget() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<RegimeData>({
    queryKey: ["regime"],
    queryFn: () => api.getRegime(),
    staleTime: 60_000,
  });

  const regime = data?.regime ?? "unknown";

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", data ? regimeBorder(regime) : "border-border bg-surface")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
          <Brain className="h-3.5 w-3.5" />
          Market Regime
        </div>
        <button
          onClick={() => { api.getRegime(true).then(() => qc.invalidateQueries({ queryKey: ["regime"] })); }}
          className="text-muted hover:text-text transition-colors"
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </button>
      </div>

      {isLoading && <div className="text-sm text-muted-2 animate-pulse">Loading…</div>}
      {isError && <div className="text-sm text-red-400">Failed to load regime</div>}
      {data && (
        <>
          <div className={cn("text-3xl font-black capitalize", regimeColor(regime))}>
            {regime.replace("_", " ")}
          </div>
          <div className="text-xs text-muted-2">
            Confidence: <span className="font-semibold text-text">{(data.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
            {Object.entries(data.details ?? {}).slice(0, 6).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[11px]">
                <span className="text-muted-2 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-mono text-text">{typeof v === "number" ? v.toFixed(2) : String(v)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── FII/DII widget ─────────────────────────────────────────────────────────

function FiiDiiWidget() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<FiiDiiData>({
    queryKey: ["fiidii"],
    queryFn: () => api.getFiiDii(),
    staleTime: 120_000,
  });

  const fiiNet = data?.net_7day_fii ?? 0;
  const diiNet = data?.net_7day_dii ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
          <TrendingUp className="h-3.5 w-3.5" />
          FII / DII Flow · 7 day
        </div>
        <button
          onClick={() => { api.getFiiDii(true).then(() => qc.invalidateQueries({ queryKey: ["fiidii"] })); }}
          className="text-muted hover:text-text transition-colors"
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </button>
      </div>

      {isLoading && <div className="text-sm text-muted-2 animate-pulse">Loading…</div>}
      {isError && <div className="text-sm text-red-400">Failed to load FII/DII data</div>}
      {data?.error && <div className="text-xs text-yellow-400">{data.error}</div>}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-muted-2 mb-1">FII Net</div>
              <div className={cn("flex items-center gap-1 text-sm font-bold", fiiNet >= 0 ? "text-[var(--groww-green)]" : "text-red-400")}>
                {fiiNet >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                ₹{Math.abs(fiiNet).toFixed(0)} Cr
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-2 mb-1">DII Net</div>
              <div className={cn("flex items-center gap-1 text-sm font-bold", diiNet >= 0 ? "text-[var(--groww-green)]" : "text-red-400")}>
                {diiNet >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                ₹{Math.abs(diiNet).toFixed(0)} Cr
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-2 mb-1">Signal</div>
              <div className="text-sm font-bold text-text">{data.score.toFixed(0)}/100</div>
            </div>
          </div>

          <div className="space-y-1">
            {(data.entries ?? []).slice(0, 4).map((e) => (
              <div key={e.date} className="flex justify-between text-[11px] border-t border-border/50 pt-1">
                <span className="text-muted-2">{e.date}</span>
                <span className={e.fii_net >= 0 ? "text-[var(--groww-green)]" : "text-red-400"}>
                  FII {e.fii_net >= 0 ? "+" : ""}{e.fii_net.toFixed(0)}
                </span>
                <span className={e.dii_net >= 0 ? "text-[var(--groww-green)]" : "text-red-400"}>
                  DII {e.dii_net >= 0 ? "+" : ""}{e.dii_net.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Policy summary ─────────────────────────────────────────────────────────

function PolicySummary() {
  const { data, isLoading } = useQuery({
    queryKey: ["policy"],
    queryFn: () => api.getPolicy(),
    staleTime: 300_000,
  });

  const killSwitch = (data as any)?.kill_switch ?? false;
  const autoExec = data?.auto_execute ?? false;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
        {killSwitch ? <ShieldOff className="h-3.5 w-3.5 text-red-400" /> : <ShieldCheck className="h-3.5 w-3.5 text-[var(--groww-green)]" />}
        Conviction Policy
      </div>

      {isLoading && <div className="text-sm text-muted-2 animate-pulse">Loading…</div>}
      {data && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-2">Kill switch</span>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", killSwitch ? "bg-red-500/15 text-red-400" : "bg-[var(--groww-green)]/10 text-[var(--groww-green)]")}>
              {killSwitch ? "ACTIVE" : "OFF"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-2">Auto-execute</span>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", autoExec ? "bg-[var(--groww-purple)]/15 text-[var(--groww-purple)]" : "bg-surface-2 text-muted")}>
              {autoExec ? "ON" : "OFF"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 border-t border-border/50">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-2">Min conviction</span>
              <span className="font-mono text-text">{data.min_conviction}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-2">Cash reserve</span>
              <span className="font-mono text-text">{data.cash_reserve_pct}%</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-2">Max position</span>
              <span className="font-mono text-text">{data.max_position_pct}%</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-2">Monthly budget</span>
              <span className="font-mono text-text">
                {data.monthly_budget ? `₹${Number(data.monthly_budget).toLocaleString()}` : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Watchlist panel ────────────────────────────────────────────────────────

function WatchlistPanel() {
  const qc = useQueryClient();
  const [symbol, setSymbol] = React.useState("");
  const [exchange, setExchange] = React.useState("NSE");
  const [sector, setSector] = React.useState("");

  const { data: items = [], isLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: () => api.listWatchlist(),
    staleTime: 60_000,
  });

  const { mutate: addItem, isPending: isAdding } = useMutation({
    mutationFn: () =>
      api.addWatchlist({ symbol: symbol.trim().toUpperCase(), exchange, sector: sector.trim() || undefined }),
    onSuccess: () => {
      toast.success(`${symbol.trim().toUpperCase()} added to watchlist`);
      setSymbol("");
      setSector("");
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: removeItem } = useMutation({
    mutationFn: (id: string) => api.removeWatchlist(id),
    onSuccess: () => {
      toast.success("Symbol removed");
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
          <List className="h-3.5 w-3.5" />
          Scanner Watchlist
        </div>
        <span className="text-[11px] text-muted-2">{items.length} symbols</span>
      </div>

      <p className="text-[11px] text-muted-2 leading-relaxed">
        Symbols here are scored by the AI scanner at 08:55 IST, 12:30, and 16:00 every trading day.
      </p>

      {/* Add form */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (symbol.trim()) addItem(); }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="SYMBOL"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="flex-1 h-8 rounded-lg border border-border bg-surface-2 px-3 text-xs font-mono text-text placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-[var(--groww-purple)] uppercase min-w-0"
        />
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
          className="h-8 rounded-lg border border-border bg-surface-2 px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-[var(--groww-purple)]"
        >
          <option value="NSE">NSE</option>
          <option value="BSE">BSE</option>
        </select>
        <button
          type="submit"
          disabled={isAdding || !symbol.trim()}
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--groww-purple)] text-white disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
        >
          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </form>

      {/* List */}
      {isLoading && <div className="text-xs text-muted-2 animate-pulse">Loading…</div>}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-6 text-xs text-muted-2">
          No symbols yet. Add your first stock above.
        </div>
      )}
      {items.length > 0 && (
        <div className="divide-y divide-border/60 rounded-lg border border-border overflow-hidden">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-semibold text-sm text-text">{item.symbol}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-2">{item.exchange}</span>
                {item.sector && (
                  <span className="text-[10px] text-muted-2 truncate">{item.sector}</span>
                )}
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-muted-2 hover:text-red-400 transition-colors ml-2 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Conviction analysis panel ──────────────────────────────────────────────

type ConvictionResult = {
  recommendation_id: string;
  action: string;
  conviction: number;
  status: string;
  policy_allowed: boolean | null;
  guard_passed: boolean;
};

function AnalysisPanel() {
  const [inputSymbol, setInputSymbol] = React.useState("");
  const [exchange, setExchange] = React.useState("NSE");
  const [result, setResult] = React.useState<any>(null);

  const { mutate: runAnalysis, isPending } = useMutation({
    mutationFn: () =>
      api.decide({ symbol: inputSymbol.trim().toUpperCase(), exchange }),
    onSuccess: (data) => setResult(data),
    onError: (err: Error) => toast.error(err.message || "Analysis failed"),
  });

  const band = result
    ? result.conviction >= 75
      ? "BUY"
      : result.conviction >= 50
      ? "HOLD"
      : "AVOID"
    : null;

  const bandStyle =
    band === "BUY"
      ? "text-[var(--groww-green)] bg-[var(--groww-green)]/10 border-[var(--groww-green)]/30"
      : band === "HOLD"
      ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
      : "text-red-400 bg-red-400/10 border-red-400/30";

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
          <Zap className="h-3.5 w-3.5" />
          Run Full AI Analysis
        </div>
        <p className="text-[11px] text-muted-2 leading-relaxed">
          Triggers the 6-analyst pipeline (fundamental · technical · news · sector · institutional · risk)
          + bull/bear debate. Takes 20–60 seconds.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (inputSymbol.trim()) runAnalysis(); }}
          className="space-y-3"
        >
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="INFY, RELIANCE, HDFCBANK…"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              className="flex-1 h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm font-mono text-text placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-[var(--groww-purple)] uppercase"
            />
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface-2 px-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-[var(--groww-purple)]"
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending || !inputSymbol.trim()}
            className="w-full h-9 flex items-center justify-center gap-2 rounded-lg bg-[var(--groww-purple)] text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Run Conviction Analysis
              </>
            )}
          </button>
        </form>

        {/* Score legend */}
        <div className="border-t border-border/50 pt-3 grid grid-cols-3 gap-2">
          {[
            { band: "BUY", range: "≥ 75", icon: TrendingUp, color: "text-[var(--groww-green)]" },
            { band: "HOLD", range: "50–74", icon: AlertTriangle, color: "text-yellow-400" },
            { band: "AVOID", range: "< 50", icon: TrendingDown, color: "text-red-400" },
          ].map(({ band, range, icon: Icon, color }) => (
            <div key={band} className="flex flex-col items-center gap-1 text-center">
              <Icon className={cn("h-4 w-4", color)} />
              <span className={cn("text-[11px] font-bold", color)}>{band}</span>
              <span className="text-[10px] text-muted-2">{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
          {/* Score header */}
          <div className="flex items-center gap-4">
            <div className="text-center shrink-0">
              <div className={cn("text-5xl font-black tabular-nums", band === "BUY" ? "text-[var(--groww-green)]" : band === "HOLD" ? "text-yellow-400" : "text-red-400")}>
                {result.conviction.toFixed(0)}
              </div>
              <div className="text-[10px] text-muted-2 mt-0.5">/ 100</div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg text-text">{inputSymbol.toUpperCase()}</span>
                <span className="text-xs px-1.5 py-0.5 border border-border rounded text-muted-2">{exchange}</span>
                {band && (
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", bandStyle)}>{band}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {result.guard_passed ? (
                  <span className="flex items-center gap-1 text-[var(--groww-green)]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Guard passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-3.5 w-3.5" /> Guard blocked
                  </span>
                )}
                <span className="text-muted-2 capitalize">{result.status?.replace(/_/g, " ")}</span>
              </div>
            </div>
          </div>

          {/* Link to full detail */}
          {result.recommendation_id && (
            <a
              href={`/recommendations/${result.recommendation_id}`}
              className="flex items-center justify-center gap-2 w-full h-8 rounded-lg border border-[var(--groww-purple)]/40 text-[var(--groww-purple)] text-xs font-semibold hover:bg-[var(--groww-purple)]/5 transition-colors"
            >
              View full analysis · debate · guards →
            </a>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !isPending && (
        <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center py-12 gap-3 text-center">
          <Brain className="h-10 w-10 text-muted-2 opacity-40" />
          <p className="text-sm text-muted-2">Enter a symbol and run analysis</p>
          <p className="text-[11px] text-muted-2 opacity-70 max-w-[240px] leading-relaxed">
            6 AI analysts score the stock across fundamental, technical, news, sector, institutional, and risk dimensions
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SignalsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--groww-purple)]/10 border border-[var(--groww-purple)]/20">
          <Zap className="h-5 w-5 text-[var(--groww-purple)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text">AI Signals</h1>
          <p className="text-xs text-muted-2">
            Market regime · FII/DII institutional flow · Conviction analysis · Scanner watchlist
          </p>
        </div>
      </div>

      {/* Top row: regime + FII/DII + policy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RegimeWidget />
        <FiiDiiWidget />
        <PolicySummary />
      </div>

      {/* Bottom: watchlist + analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WatchlistPanel />
        <AnalysisPanel />
      </div>
    </div>
  );
}
