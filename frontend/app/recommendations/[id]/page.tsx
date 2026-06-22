"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  Zap,
  BrainCircuit,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ConvictionGauge } from "@/components/conviction-gauge";
import { PageHeader } from "@/components/page-header";
import { ActionBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

/* Groww colors per agent */
const AGENT_COLORS: Record<string, string> = {
  fundamental:   "#6747f5",
  technical:     "#f89c23",
  news:          "#00d09c",
  sector:        "#00a3ff",
  institutional: "#00bfa5",
  risk:          "#eb3b5a",
};

function agentColor(name: string) {
  return AGENT_COLORS[name.toLowerCase()] ?? "#888888";
}

function scoreColor(score: number) {
  if (score >= 75) return "var(--groww-green)";
  if (score >= 50) return "var(--groww-orange)";
  return "var(--groww-red)";
}

function ScoreIcon({ score }: { score: number }) {
  if (score >= 65) return <TrendingUp className="h-3.5 w-3.5" />;
  if (score >= 45) return <Minus className="h-3.5 w-3.5" />;
  return <TrendingDown className="h-3.5 w-3.5" />;
}


export default function ThesisView() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [qty, setQty] = React.useState(1);

  const { data: rec, isLoading } = useQuery({
    queryKey: ["recommendation", id],
    queryFn: () => api.getRecommendation(id),
  });

  const execute = useMutation({
    mutationFn: () => api.execute(id, { quantity: qty }),
    onSuccess: () => {
      toast.success("Order placed via gateway");
      qc.invalidateQueries({ queryKey: ["recommendation", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !rec) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-80 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const guardPassed = rec.status === "guard_passed";


  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <PageHeader
        title={`${rec.symbol ?? "—"} · ${rec.exchange ?? "NSE"}`}
        subtitle={`ID: ${rec.id.slice(0, 8)} · Base score ${rec.base_score.toFixed(1)} · ${rec.band}`}
        action={
          <div className="flex items-center gap-2">
            <ActionBadge action={rec.action} />
            <StatusBadge status={rec.status} />
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Conviction",
            value: rec.conviction.toFixed(0),
            sub: rec.band ?? rec.action,
            color: scoreColor(rec.conviction),
          },
          {
            label: "Base Score",
            value: rec.base_score.toFixed(1),
            sub: "raw weighted score",
            color: "var(--groww-purple)",
          },
          {
            label: "Guard",
            value: guardPassed ? "Passed" : "Failed",
            sub: guardPassed ? "ready to execute" : "gate blocked",
            color: guardPassed ? "var(--groww-green)" : "var(--groww-red)",
          },
          {
            label: "Auto-exec",
            value: "No",
            sub: "human approval required",
            color: "var(--groww-orange)",
          },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} className="relative overflow-hidden p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-xl" style={{ background: color }} />
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted">{label}</div>
            <div className="tabular mt-2 text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="mt-0.5 text-[11px] text-muted">{sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        {/* Left column: gauge + execution */}
        <div className="space-y-4">
          {/* Conviction gauge */}
          <Card>
            <CardContent className="flex flex-col items-center pt-6 pb-5">
              <ConvictionGauge value={rec.conviction} />
              {rec.conviction_breakdown?.length > 0 && (
                <div className="mt-5 w-full space-y-2.5 border-t border-border pt-4">
                  {rec.conviction_breakdown.map((c) => {
                    const pct = rec.base_score > 0
                      ? Math.max(0, Math.min(100, (c.contribution / rec.base_score) * 100))
                      : 0;
                    const col = agentColor(c.component);
                    return (
                      <div key={c.component}>
                        <div className="mb-1 flex justify-between text-[11px]">
                          <span className="capitalize text-muted">{c.component.replace(/_/g, " ")}</span>
                          <span className="tabular font-semibold" style={{ color: col }}>
                            {c.contribution.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: col, boxShadow: `0 0 6px ${col}50` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Execution panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[var(--groww-yellow)]" />
                Execution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guardPassed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-[11px] uppercase tracking-wider text-muted">Qty</label>
                    <Input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value) || 1)}
                      className="h-8 w-24"
                    />
                  </div>
                  <Button
                    variant="blue"
                    className="w-full"
                    disabled={execute.isPending}
                    onClick={() => execute.mutate()}
                  >
                    {execute.isPending ? "Placing…" : "Approve & Execute"}
                  </Button>
                  <p className="text-[11px] leading-relaxed text-muted">
                    Human-approved. Routes to Groww via the gateway. Idempotent.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <ShieldAlert className="h-8 w-8 text-[var(--groww-red)]" />
                  <p className="text-[12px] font-medium text-text">Guard Failed</p>
                  <p className="text-[11px] text-muted">
                    This recommendation did not pass the Trade Guard.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Agent Debate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-[var(--groww-purple)]" />
                Agent Debate
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {rec.agent_scores.map((a, i) => {
                const col = agentColor(a.agent);
                const sc = scoreColor(a.score);
                return (
                  <motion.div
                    key={a.agent}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-surface-2/40 p-4 transition-colors hover:bg-surface-2/70"
                  >
                    {/* Agent header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: col, boxShadow: `0 0 6px ${col}` }}
                        />
                        <span className="text-[12px] font-semibold capitalize text-text">
                          {a.agent}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" style={{ color: sc }}>
                        <ScoreIcon score={a.score} />
                        <span className="tabular text-sm font-bold">{a.score.toFixed(0)}</span>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${a.score}%`, background: col }}
                      />
                    </div>
                    {/* Rationale */}
                    {a.rationale && (
                      <p className="text-[11px] leading-relaxed text-muted line-clamp-4">
                        {a.rationale}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          {/* Policy Ledger + Trade Guard side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--groww-purple)]" />
                  Policy Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {rec.policy_evaluations.map((p) => (
                  <CheckRow key={p.rule} ok={p.passed} label={p.rule} detail={p.detail} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[var(--groww-orange)]" />
                  Trade Guard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {rec.trade_guard_results.length === 0 ? (
                  <p className="text-[12px] text-muted">No guard checks (pre-gate).</p>
                ) : (
                  rec.trade_guard_results.map((g) => (
                    <CheckRow
                      key={g.check_name}
                      ok={g.passed}
                      label={g.check_name}
                      detail={g.detail}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Thesis — dynamic AI summary */}
          {rec.thesis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[var(--groww-teal)]" />
                  AI Decision Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[13px] leading-relaxed text-text font-normal italic">
                  &ldquo;{rec.thesis}&rdquo;
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: ok ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)",
          color: ok ? "var(--groww-green)" : "var(--groww-red)",
        }}
      >
        {ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      </span>
      <div>
        <div className="text-[12px] font-medium capitalize text-text">
          {label.replace(/_/g, " ")}
        </div>
        <div className="text-[11px] leading-relaxed text-muted">{detail}</div>
      </div>
    </div>
  );
}
