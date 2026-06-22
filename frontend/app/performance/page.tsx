"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BarChart3, Award, Zap, TrendingUp } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

/* Groww color palette for charts */
const APPLE_COLORS = [
  "#6747f5", // purple
  "#00d09c", // green
  "#f89c23", // orange
  "#00a3ff", // blue
  "#eb3b5a", // red
  "#00bfa5", // teal
  "#4c6ef5", // indigo
  "#ff6b9d", // pink
];

/* Custom tooltip for Recharts */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-[12px] shadow-card">
      {label && <p className="mb-1 font-semibold text-text">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

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

export default function PerformancePage() {
  const { data: accuracy, isLoading: isAccLoading } = useQuery({
    queryKey: ["performance", "accuracy"],
    queryFn: () => api.agentAccuracy(),
  });

  const { data: outperformers, isLoading: isOutLoading } = useQuery({
    queryKey: ["performance", "outperformers"],
    queryFn: () => api.outperformers(),
  });

  const isLoading = isAccLoading || isOutLoading;

  const calibrationPoints = React.useMemo(() => {
    if (!outperformers) return [];
    return outperformers
      .filter((item) => formatSecurity(item.security_id) !== null)
      .map((item) => ({
        conviction: item.conviction,
        alpha: item.alpha,
        id: formatSecurity(item.security_id)!,
        action: item.action,
      }));
  }, [outperformers]);

  const stats = React.useMemo(() => {
    const list = (outperformers ?? []).filter((item) => formatSecurity(item.security_id) !== null);
    if (list.length === 0) return { avgAlpha: 0, topAlpha: 0, count: 0 };
    const total = list.reduce((acc, curr) => acc + curr.alpha, 0);
    const top = Math.max(...list.map((l) => l.alpha), 0);
    return { avgAlpha: total / list.length, topAlpha: top, count: list.length };
  }, [outperformers]);

  /* Bar chart data from accuracy */
  const barData = React.useMemo(() => {
    if (!accuracy) return [];
    return accuracy.map((a, i) => ({
      name: a.agent.replace(/_/g, " "),
      accuracy: parseFloat((a.accuracy * 100).toFixed(1)),
      samples: a.samples,
      color: APPLE_COLORS[i % APPLE_COLORS.length],
    }));
  }, [accuracy]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calibration & Accuracy" subtitle="Loading performance telemetry..." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="h-64 animate-pulse bg-surface-2/40" />
          <Card className="h-64 animate-pulse bg-surface-2/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Calibration & Accuracy"
        subtitle="Agent forecast accuracy and conviction-to-alpha alignment telemetry."
      />

      {/* Mini Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-xl bg-[var(--groww-green)]" />
          <CardHeader className="pb-1">
            <CardDescription className="text-[11px] uppercase tracking-widest">
              Average Alpha vs NIFTY
            </CardDescription>
            <div className="tabular mt-2 text-3xl font-bold text-[var(--groww-green)]">
              +{stats.avgAlpha.toFixed(2)}%
            </div>
          </CardHeader>
          <CardContent className="text-[12px] text-muted flex items-center gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-[var(--groww-green)]" />
            Outperforming index average
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-xl bg-[var(--groww-orange)]" />
          <CardHeader className="pb-1">
            <CardDescription className="text-[11px] uppercase tracking-widest">
              Peak Alpha Yield
            </CardDescription>
            <div className="tabular mt-2 text-3xl font-bold text-[var(--groww-orange)]">
              +{stats.topAlpha.toFixed(2)}%
            </div>
          </CardHeader>
          <CardContent className="text-[12px] text-muted flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[var(--groww-orange)]" />
            Best performing signal
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-xl bg-[var(--groww-purple)]" />
          <CardHeader className="pb-1">
            <CardDescription className="text-[11px] uppercase tracking-widest">
              Tracked Outcomes
            </CardDescription>
            <div className="tabular mt-2 text-3xl font-bold text-[var(--groww-purple)]">
              {stats.count}
            </div>
          </CardHeader>
          <CardContent className="text-[12px] text-muted flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-[var(--groww-purple)]" />
            Historical sample count
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Agent Accuracy Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[var(--groww-yellow)]" />
              Agent Accuracy Leaderboard
            </CardTitle>
            <CardDescription>
              Predictive accuracy scores across all decision cycles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!accuracy || accuracy.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No historical accuracy records.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 4, right: 8, bottom: 4, left: -20 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted)", fontSize: 10 }}
                    />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "var(--surface-2)", radius: 4 }}
                    />
                    <Bar dataKey="accuracy" name="Accuracy %" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{ filter: `drop-shadow(0 2px 8px ${entry.color}50)` }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Progress bars */}
            {accuracy && accuracy.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {accuracy.map((agent, i) => {
                  const color = APPLE_COLORS[i % APPLE_COLORS.length];
                  return (
                    <div key={agent.agent} className="space-y-1.5">
                      <div className="flex justify-between text-[12px]">
                        <span className="font-medium capitalize text-text">
                          {agent.agent.replace(/_/g, " ")}
                        </span>
                        <span className="tabular text-muted">
                          {(agent.accuracy * 100).toFixed(0)}%
                          <span className="ml-1 text-[10px]">({agent.samples} samples)</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${agent.accuracy * 100}%`,
                            background: color,
                            boxShadow: `0 0 8px ${color}60`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conviction vs Alpha Scatter */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--groww-purple)]" />
              Conviction vs. Alpha Calibration
            </CardTitle>
            <CardDescription>
              Higher conviction should produce superior alpha returns.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[320px]">
            {calibrationPoints.length === 0 ? (
              <div className="text-center text-sm text-muted flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
                  <BarChart3 className="h-5 w-5 text-muted" />
                </div>
                No calibration data yet
              </div>
            ) : (
              <div className="h-72 w-full pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      type="number"
                      dataKey="conviction"
                      name="Conviction"
                      domain={[50, 100]}
                      stroke="var(--muted)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Conviction",
                        position: "insideBottom",
                        offset: -8,
                        fontSize: 10,
                        fill: "var(--muted)",
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="alpha"
                      name="Alpha %"
                      unit="%"
                      stroke="var(--muted)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ZAxis range={[50, 80]} />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ strokeDasharray: "3 3", stroke: "var(--border-2)" }}
                    />
                    <Scatter name="Recommendations" data={calibrationPoints}>
                      {calibrationPoints.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.alpha >= 0 ? "#00d09c" : "#eb3b5a"}
                          style={{
                            filter: `drop-shadow(0 0 4px ${entry.alpha >= 0 ? "#00d09c60" : "#eb3b5a60"})`,
                          }}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outperformers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Yielding Opportunities</CardTitle>
          <CardDescription>
            Historical signal recommendations that delivered maximum alpha returns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!outperformers || outperformers.filter((out) => formatSecurity(out.security_id) !== null).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No historical outperformer data.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted">
                    <th className="py-3 font-medium">Asset / Ticker</th>
                    <th className="py-3 font-medium">Side</th>
                    <th className="py-3 font-medium text-right">Conviction</th>
                    <th className="py-3 font-medium text-right">Alpha Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {outperformers
                    .filter((out) => formatSecurity(out.security_id) !== null)
                    .map((out, i) => {
                      const color = APPLE_COLORS[i % APPLE_COLORS.length];
                      const name = formatSecurity(out.security_id)!;
                      return (
                        <tr
                          key={out.recommendation_id}
                          className="group transition-colors hover:bg-surface-2/40"
                        >
                          <td className="py-3 font-semibold text-text">
                            <Link
                              href={`/recommendations/${out.recommendation_id}`}
                              className="hover:underline underline-offset-2"
                              style={{ color }}
                            >
                              {name}
                            </Link>
                          </td>
                          <td className="py-3">
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                              style={{
                                backgroundColor: `${color}18`,
                                color,
                                border: `1px solid ${color}30`,
                              }}
                            >
                              {out.action}
                            </span>
                          </td>
                          <td className="py-3 text-right tabular font-medium text-text">
                            {out.conviction.toFixed(0)}
                          </td>
                          <td className="py-3 text-right tabular font-bold text-[var(--groww-green)]">
                            +{out.alpha.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
