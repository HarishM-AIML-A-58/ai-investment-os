"use client";

import { useMutation } from "@tanstack/react-query";
import { Terminal, Search, Link2, Sparkles, BrainCircuit } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { MemoryHit } from "@/lib/types";

const getKindColor = (kind: string) => {
  switch (kind?.toLowerCase()) {
    case "thesis":    return "#6747f5";
    case "filing":    return "#00a3ff";
    case "sentinel":  return "#00d09c";
    case "news":      return "#f89c23";
    default:          return "#00bfa5";
  }
};

export default function MemoryPage() {
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<MemoryHit[]>([]);

  const search = useMutation({
    mutationFn: (q: string) => api.memorySearch(q, 10),
    onSuccess: (data) => {
      setHits(data ?? []);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    search.mutate(query);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Semantic Memory"
        subtitle="Search over past agent deliberations, public filing groundings, and analysis ledgers."
      />

      {/* Terminal Input Section */}
      <Card className="border border-border bg-surface/30 backdrop-blur-md relative overflow-hidden group">
        {/* Glow effect at top left */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[var(--groww-purple)]/5 blur-2xl transition-opacity group-hover:opacity-100" />
        <CardContent className="pt-6 relative">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3.5 flex items-center text-muted-foreground/70">
                <Terminal className="h-4 w-4 text-[var(--groww-purple)] animate-pulse" />
              </span>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query pgvector database (e.g. Reliance solar refinery, TCS margin expansion, risk factors...)"
                className="pl-10 font-mono text-sm bg-surface-2 border-border/80 focus:border-[var(--groww-purple)]/50 focus:ring-1 focus:ring-[var(--groww-purple)]/30 text-text transition-all duration-300 placeholder:text-muted/60"
              />
            </div>
            <Button
              type="submit"
              disabled={search.isPending || !query.trim()}
              className="bg-white hover:bg-neutral-200 text-black border border-transparent font-mono text-xs uppercase tracking-wider shrink-0 transition-all duration-200 shadow-sm"
            >
              {search.isPending ? (
                <span className="flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5 animate-spin" /> Recalling...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" /> Execute
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card className="border border-border bg-surface/40 backdrop-blur-md">
        <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Memory Recall Feed</CardTitle>
            <CardDescription className="text-xs text-muted">
              Matches sorted by semantic vector distance (pgvector cosine similarity).
            </CardDescription>
          </div>
          {hits.length > 0 && (
            <span className="text-[10px] uppercase font-mono tracking-widest bg-surface-2 border border-border px-2 py-0.5 rounded text-muted">
              {hits.length} Hits
            </span>
          )}
        </CardHeader>
        <CardContent className="pt-5">
          {search.isPending ? (
            <div className="flex flex-col items-center py-20 text-sm text-muted font-mono">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-[var(--groww-purple)]" />
              <span>Executing cosine similarity search...</span>
            </div>
          ) : hits.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted/80 font-mono flex flex-col items-center justify-center gap-3">
              <BrainCircuit className="h-10 w-10 text-muted/30" />
              <span>
                {search.isSuccess
                  ? "No semantic matches found in database."
                  : "Database idle. Submit a query to scan pgvector index."}
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {hits.map((hit, index) => {
                const similarityScore = Math.max(0, Math.min(100, (1 - hit.distance) * 100));
                const color = getKindColor(hit.kind);
                return (
                  <div
                    key={index}
                    className="group rounded-xl border border-border/80 bg-surface-2/85 p-5 transition-all duration-300 hover:border-border-2 hover:bg-surface-2"
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.015)",
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold"
                          style={{
                            backgroundColor: `${color}15`,
                            color: color,
                            border: `1px solid ${color}30`,
                          }}
                        >
                          {hit.kind}
                        </span>
                        <span className="text-[10px] text-muted font-mono">
                          Distance: <span className="text-text/70">{hit.distance.toFixed(4)}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-mono font-bold"
                            style={{ color }}
                          >
                            {similarityScore.toFixed(1)}% Match
                          </span>
                          {/* Mini similarity indicator bar */}
                          <div className="h-1.5 w-16 bg-surface-2 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${similarityScore}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>

                        {hit.ref_id && (
                          <Link
                            href={`/recommendations/${hit.ref_id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-[var(--groww-purple)] hover:opacity-80 transition-opacity font-semibold font-mono border border-[var(--groww-purple)]/20 hover:border-[var(--groww-purple)]/40 rounded px-2 py-0.5 bg-[var(--groww-purple)]/5"
                          >
                            <Link2 className="h-3.5 w-3.5" /> Source
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 relative bg-surface-3 rounded-lg border border-border/40 p-4">
                      <div className="absolute right-3 top-3 opacity-20 pointer-events-none">
                        <Sparkles className="h-4 w-4 text-muted" />
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap selection:bg-[var(--groww-purple)]/25 select-text">
                        {hit.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
