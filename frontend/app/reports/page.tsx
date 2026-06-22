"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, Plus, AlertCircle, TrendingUp, Sparkles, Calendar, Settings2, ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ActionBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { ReportPayload } from "@/lib/types";

export default function ReportsPage() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = React.useState(todayStr);
  const [type, setType] = React.useState<"morning" | "evening">("morning");

  // Fetch report query
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["report", date, type],
    queryFn: () => api.getReport(date, type),
    retry: false, // Don't retry on 404
  });

  // Generate report mutation
  const generate = useMutation({
    mutationFn: () => api.generateReport(date, type),
    onSuccess: () => {
      toast.success("Intelligence report generated successfully");
      refetch();
    },
    onError: (e: Error) => {
      toast.error(`Generation failed: ${e.message}`);
    },
  });

  const handleGenerate = () => {
    generate.mutate();
  };

  const hasReport = !!reportData?.payload;
  const payload: ReportPayload | undefined = reportData?.payload;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Intelligence Reports"
        subtitle="Daily summarized market outlooks, hot sweeps, and conviction recommendations."
      />

      {/* Selector controls */}
      <Card className="border border-border bg-surface/40 backdrop-blur-md">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label htmlFor="report-date" className="text-[10px] uppercase font-mono tracking-widest text-muted flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--groww-purple)]" />
                Report Date
              </Label>
              <Input
                id="report-date"
                type="date"
                value={date}
                max={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="bg-surface-2 border-border/80 text-text font-mono text-sm focus:border-[var(--groww-purple)]/50"
              />
            </div>

            <div className="space-y-1.5 min-w-[180px]">
              <Label htmlFor="report-type" className="text-[10px] uppercase font-mono tracking-widest text-muted flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5 text-[var(--groww-purple)]" />
                Report Type
              </Label>
              <div className="relative">
                <select
                  id="report-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as "morning" | "evening")}
                  className="h-9 w-full rounded-md border border-border/80 bg-surface-2 px-3 font-mono text-xs text-text focus:border-[var(--groww-purple)]/60 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="morning">Morning Briefing</option>
                  <option value="evening">Evening Review</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                  <ArrowRight className="h-3 w-3 rotate-90" />
                </div>
              </div>
            </div>

            <Button
              onClick={() => refetch()}
              className="bg-white hover:bg-neutral-200 text-black border border-transparent font-mono text-xs uppercase tracking-wider h-9 shadow-sm shrink-0 px-4"
            >
              Check Archive
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center py-24 text-sm text-muted font-mono">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-[var(--groww-purple)]" />
          <span>Querying archive database...</span>
        </div>
      ) : hasReport && payload ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main report details */}
          <Card className="lg:col-span-2 border border-border bg-surface/40 backdrop-blur-md relative overflow-hidden">
            {/* Subtle glow behind title */}
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[var(--groww-purple)]/5 blur-3xl" />
            <CardHeader className="pb-3 border-b border-border/40 relative">
              <div className="flex items-center gap-1.5 text-[var(--groww-purple)]">
                <FileText className="h-4 w-4" />
                <span className="text-[9px] uppercase font-bold tracking-widest font-mono">{payload.type} Briefing</span>
              </div>
              <CardTitle className="text-xl font-bold mt-1">
                Market Intelligence: {payload.generated_for}
              </CardTitle>
              <CardDescription className="text-xs text-muted">
                AI sweep finished successfully. Compiled for operational decisions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
              {/* Opportunities list */}
              <div>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted border-b border-border/20 pb-2 mb-4">
                  Top Gated Opportunities
                </h3>
                {payload.top_opportunities.length === 0 ? (
                  <p className="text-xs text-muted font-mono py-4">No high-conviction opportunities identified in this cycle.</p>
                ) : (
                  <div className="space-y-3">
                    {payload.top_opportunities.map((opp) => (
                      <div
                        key={opp.recommendation_id}
                        className="group flex items-center justify-between rounded-xl border border-border bg-surface-2/80 p-4 transition-all duration-300 hover:bg-[#151515] hover:border-border-hover"
                      >
                        <div className="flex items-center gap-3">
                          <ActionBadge action={opp.action} />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono text-muted uppercase">Band: <span className="text-text/80 font-bold">{opp.band}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="tabular text-xs font-mono font-bold text-[var(--groww-purple)]">
                            {opp.conviction.toFixed(0)}% Conviction
                          </span>
                          <Link
                            href={`/recommendations/${opp.recommendation_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--groww-purple)] hover:opacity-85 transition-opacity font-mono"
                          >
                            Open Thesis <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stocks to watch */}
          <div className="space-y-6">
            <Card className="border border-border bg-surface/40 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <TrendingUp className="h-5 w-5 text-[var(--groww-green)]" />
                  Scanner Tickers
                </CardTitle>
                <CardDescription className="text-xs text-muted">Securities selected for focused monitoring.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {payload.stocks_to_watch.length === 0 ? (
                  <p className="text-xs text-muted font-mono py-4">No specific focus symbols selected.</p>
                ) : (
                  <ul className="divide-y divide-border/20">
                    {payload.stocks_to_watch.map((stock) => (
                      <li key={stock} className="py-3 flex justify-between items-center text-sm font-mono">
                        <span className="font-bold text-[var(--groww-purple)]">{stock}</span>
                        <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold text-[var(--groww-green)] bg-[var(--groww-green)]/10 px-2 py-0.5 border border-[var(--groww-green)]/20 rounded-full">
                          <span className="h-1.5 w-1.5 bg-[var(--groww-green)] rounded-full animate-ping" />
                          Active Scanner
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-2 border-border/80 bg-surface/20 relative overflow-hidden">
          {/* Ambient glow in center */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-60 w-60 rounded-full bg-[var(--groww-purple)]/5 blur-3xl" />
          <CardContent className="flex flex-col items-center justify-center py-20 text-center relative z-10">
            {error ? (
              <>
                <div className="h-12 w-12 rounded-full bg-[var(--groww-red)]/10 border border-[var(--groww-red)]/20 flex items-center justify-center mb-5 animate-pulse-glow">
                  <AlertCircle className="h-6 w-6 text-[var(--groww-red)]" />
                </div>
                <h3 className="text-lg font-bold text-text">Report Not Found</h3>
                <p className="text-xs text-muted mt-2 max-w-sm font-mono leading-relaxed">
                  No intelligence report has been generated for {date} ({type}). Run the generation pipeline to build one now.
                </p>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-[var(--groww-purple)]/10 border border-[var(--groww-purple)]/20 flex items-center justify-center mb-5 animate-pulse">
                  <Sparkles className="h-6 w-6 text-[var(--groww-purple)]" />
                </div>
                <h3 className="text-lg font-bold text-text">Create Briefing Report</h3>
                <p className="text-xs text-muted mt-2 max-w-sm font-mono leading-relaxed">
                  Synthesize analyst agent debates, guard checks, and policy evaluations into a single daily decision briefing.
                </p>
              </>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="mt-6 font-mono text-xs uppercase tracking-wider bg-white hover:bg-neutral-200 text-black border border-transparent shadow-sm px-6 py-2 h-9"
            >
              {generate.isPending ? (
                <span className="flex items-center gap-1.5">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Synthesizing Report...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Generate Report
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
