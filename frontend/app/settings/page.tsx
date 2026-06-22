"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sliders, Shield, Settings2, Sparkles, CheckCircle2, AlertTriangle, LayoutGrid, Coins } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type { Policy } from "@/lib/types";

export default function SettingsPage() {
  const qc = useQueryClient();

  // 1. Fetch Policy Settings from API
  const { data: policy, isLoading } = useQuery<Policy>({
    queryKey: ["policy"],
    queryFn: () => api.getPolicy(),
  });

  const savePolicy = useMutation({
    mutationFn: (updated: Policy) => api.putPolicy(updated),
    onSuccess: (data) => {
      toast.success("Policy parameters synced with backend");
      qc.setQueryData(["policy"], data);
    },
    onError: (err: Error) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });

  // Local state for non-backend UI-only settings (stored in localStorage)
  const [layoutDensity, setLayoutDensity] = React.useState<"comfortable" | "compact">("comfortable");
  const [numberFormat, setNumberFormat] = React.useState<"lakh-crore" | "absolute">("lakh-crore");
  const [accentColor, setAccentColor] = React.useState<string>("amber");

  // Conviction weights state
  const [weights, setWeights] = React.useState({
    technical: 20,
    fundamental: 30,
    sentinel: 20,
    sentiment: 15,
    risk: 15,
  });

  // Local policy fields to avoid jitter on sliders
  const [localBudget, setLocalBudget] = React.useState("");
  const [localRisk, setLocalRisk] = React.useState("moderate");
  const [localMaxPos, setLocalMaxPos] = React.useState(20);
  const [localMaxSec, setLocalMaxSec] = React.useState(30);
  const [localMinConv, setLocalMinConv] = React.useState(80);
  const [localCashReserve, setLocalCashReserve] = React.useState(20);
  const [localAutoExecute, setLocalAutoExecute] = React.useState(false);
  const [localAutonomy, setLocalAutonomy] = React.useState(0);

  // Sync state from query when loaded
  React.useEffect(() => {
    if (policy) {
      setLocalBudget(policy.monthly_budget);
      setLocalRisk(policy.risk_profile);
      setLocalMaxPos(policy.max_position_pct);
      setLocalMaxSec(policy.max_sector_pct);
      setLocalMinConv(policy.min_conviction);
      setLocalCashReserve(policy.cash_reserve_pct);
      setLocalAutoExecute(policy.auto_execute);
      setLocalAutonomy(policy.autonomy_tier);
    }
  }, [policy]);

  // Load UI settings from localStorage
  React.useEffect(() => {
    const density = localStorage.getItem("density");
    if (density === "comfortable" || density === "compact") setLayoutDensity(density);

    const format = localStorage.getItem("num-format");
    if (format === "lakh-crore" || format === "absolute") setNumberFormat(format);

    const accent = localStorage.getItem("accent");
    if (accent) setAccentColor(accent);

    const savedWeights = localStorage.getItem("weights");
    if (savedWeights) {
      try {
        setWeights(JSON.parse(savedWeights));
      } catch (e) {
        /* ignore */
      }
    }
  }, []);

  const totalWeights = weights.technical + weights.fundamental + weights.sentinel + weights.sentiment + weights.risk;
  const isWeightsValid = totalWeights === 100;

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    const updated = { ...weights, [key]: value };
    setWeights(updated);
    localStorage.setItem("weights", JSON.stringify(updated));
  };

  const handleSavePolicy = () => {
    if (!localBudget || Number(localBudget) <= 0) {
      toast.error("Please enter a valid monthly budget");
      return;
    }
    savePolicy.mutate({
      monthly_budget: String(localBudget),
      risk_profile: localRisk,
      max_position_pct: localMaxPos,
      max_sector_pct: localMaxSec,
      min_conviction: localMinConv,
      cash_reserve_pct: localCashReserve,
      auto_execute: localAutoExecute,
      autonomy_tier: localAutonomy,
    });
  };

  const handleSaveUISettings = (density: "comfortable" | "compact", format: "lakh-crore" | "absolute", accent: string) => {
    setLayoutDensity(density);
    setNumberFormat(format);
    setAccentColor(accent);
    localStorage.setItem("density", density);
    localStorage.setItem("num-format", format);
    localStorage.setItem("accent", accent);
    document.documentElement.style.setProperty("--accent-preset", accent);
    toast.success("Client UI preferences saved");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Control Room" subtitle="Syncing policy engines..." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 animate-pulse">
          <Card className="h-[450px] bg-surface-2/40 rounded-xl" />
          <Card className="h-[450px] bg-surface-2/40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Control Room"
        subtitle="Manage deterministic guardrails, conviction weights, and client-side UI configurations."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Side: Policy Rules */}
        <div className="space-y-6">
          <Card className="border border-border bg-surface/40 backdrop-blur-md relative overflow-hidden">
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
              <Shield className="h-20 w-20 text-text" />
            </div>
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-[var(--groww-purple)]" />
                Policy Rules
              </CardTitle>
              <CardDescription className="text-xs text-muted">
                Deterministic limits applied globally. Transactions violating these checks are blocked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted">Monthly Budget (₹)</Label>
                  <Input
                    type="number"
                    value={localBudget}
                    onChange={(e) => setLocalBudget(e.target.value)}
                    className="text-sm bg-surface-2 border-border/80 focus:border-[var(--groww-purple)]/50 text-text"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted">Risk Profile</Label>
                  <div className="relative">
                    <select
                      value={localRisk}
                      onChange={(e) => setLocalRisk(e.target.value)}
                      className="h-9 w-full rounded-md border border-border/80 bg-surface-2 px-3 text-xs text-text focus:border-[var(--groww-purple)]/60 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="conservative">Conservative</option>
                      <option value="moderate">Moderate</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                      <Settings2 className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-5 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Max Position Size</span>
                    <span className="tabular font-semibold text-[var(--groww-purple)]">{localMaxPos}%</span>
                  </div>
                  <Slider min={1} max={100} value={localMaxPos} onChange={setLocalMaxPos} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Max Sector Allocation</span>
                    <span className="tabular font-semibold text-[var(--groww-purple)]">{localMaxSec}%</span>
                  </div>
                  <Slider min={1} max={100} value={localMaxSec} onChange={setLocalMaxSec} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Min Conviction Score</span>
                    <span className="tabular font-semibold text-[var(--groww-green)]">{localMinConv} / 100</span>
                  </div>
                  <Slider min={50} max={100} value={localMinConv} onChange={setLocalMinConv} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Required Cash Reserve</span>
                    <span className="tabular font-semibold text-[var(--groww-orange)]">{localCashReserve}%</span>
                  </div>
                  <Slider min={0} max={50} value={localCashReserve} onChange={setLocalCashReserve} />
                </div>
              </div>

              <div className="border-t border-border/40 my-2" />

              {/* Execution Autonomy */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-surface-2 p-3 rounded-lg border border-border/50">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-text">Auto-Execute Trades</span>
                    <p className="text-[10px] text-muted mt-0.5 leading-relaxed">Directly routing signals matching thresholds to broker.</p>
                  </div>
                  <Switch checked={localAutoExecute} onChange={setLocalAutoExecute} />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted">Autonomy Level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { tier: 0, title: "Propose", desc: "Manual checks", color: "#f89c23" },
                      { tier: 1, title: "Capped", desc: "Auto under limits", color: "#6747f5" },
                      { tier: 2, title: "Full", desc: "Complete authority", color: "#00d09c" },
                    ].map((item) => {
                      const isActive = localAutonomy === item.tier;
                      return (
                        <button
                          key={item.tier}
                          type="button"
                          onClick={() => setLocalAutonomy(item.tier)}
                          className={`rounded-lg border p-3 text-left transition-all duration-300 relative overflow-hidden ${
                            isActive
                              ? "bg-surface-2 border-border"
                              : "border-border/60 bg-surface/30 hover:bg-surface-3 hover:border-border"
                          }`}
                          style={
                            isActive
                              ? {
                                  boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.02), 0 0 12px ${item.color}15`,
                                  borderColor: `${item.color}50`,
                                }
                              : undefined
                          }
                        >
                          {isActive && (
                            <div
                              className="absolute top-0 left-0 right-0 h-[2px]"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          <div
                            className="text-xs font-bold transition-colors"
                            style={isActive ? { color: item.color } : undefined}
                          >
                            {item.title}
                          </div>
                          <div className="text-[9px] text-muted mt-1 leading-tight">{item.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-4 text-xs uppercase tracking-wider bg-white hover:bg-neutral-200 text-black border border-transparent shadow-sm py-2"
                onClick={handleSavePolicy}
                disabled={savePolicy.isPending}
              >
                {savePolicy.isPending ? "Syncing..." : "Save Policy Config"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Conviction Weight Tuning + Client Settings */}
        <div className="space-y-6">
          {/* Weights Tuning */}
          <Card className="border border-border bg-surface/40 backdrop-blur-md relative overflow-hidden">
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
              <Sliders className="h-20 w-20 text-text" />
            </div>
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[var(--groww-purple)]" />
                Conviction Weights Tuning
              </CardTitle>
              <CardDescription className="text-xs text-muted">
                Assign influence percentages to the individual analyst nodes. Must sum to exactly 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Technical Analysis</span>
                    <span className="tabular font-semibold text-[var(--groww-purple)]">{weights.technical}%</span>
                  </div>
                  <Slider min={0} max={100} value={weights.technical} onChange={(v) => handleWeightChange("technical", v)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Fundamental Analysis</span>
                    <span className="tabular font-semibold text-[var(--groww-purple)]">{weights.fundamental}%</span>
                  </div>
                  <Slider min={0} max={100} value={weights.fundamental} onChange={(v) => handleWeightChange("fundamental", v)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Sentinel Guard Checks</span>
                    <span className="tabular font-semibold text-[var(--groww-green)]">{weights.sentinel}%</span>
                  </div>
                  <Slider min={0} max={100} value={weights.sentinel} onChange={(v) => handleWeightChange("sentinel", v)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Sentiment Tracking</span>
                    <span className="tabular font-semibold text-[var(--groww-orange)]">{weights.sentiment}%</span>
                  </div>
                  <Slider min={0} max={100} value={weights.sentiment} onChange={(v) => handleWeightChange("sentiment", v)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase text-[10px] tracking-wider text-muted">Risk Assessment</span>
                    <span className="tabular font-semibold text-[var(--groww-teal)]">{weights.risk}%</span>
                  </div>
                  <Slider min={0} max={100} value={weights.risk} onChange={(v) => handleWeightChange("risk", v)} />
                </div>
              </div>

              <div
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs transition-all duration-300 ${
                  isWeightsValid
                    ? "bg-[var(--groww-green)]/5 border-[var(--groww-green)]/30 text-[var(--groww-green)] shadow-[0_0_12px_rgba(48,209,88,0.05)]"
                    : "bg-[var(--groww-red)]/5 border-[var(--groww-red)]/35 text-[var(--groww-red)] animate-pulse-glow"
                }`}
              >
                <span className="uppercase tracking-wider font-semibold text-[10px] flex items-center gap-1.5">
                  {isWeightsValid ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 animate-bounce" />
                  )}
                  Total Weights Sum:
                </span>
                <span className="tabular font-bold text-sm">
                  {totalWeights}% {isWeightsValid ? "Valid" : "Error (must be 100%)"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Client-Side UI Presets */}
          <Card className="border border-border bg-surface/40 backdrop-blur-md relative overflow-hidden">
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
              <LayoutGrid className="h-20 w-20 text-text" />
            </div>
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-[var(--groww-orange)]" />
                Client Preferences
              </CardTitle>
              <CardDescription className="text-xs text-muted">Layout density, numeric formats, and color presets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted">Layout Density</Label>
                <div className="flex gap-2 bg-surface-2 p-1 rounded-lg border border-border/50">
                  {(["comfortable", "compact"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSaveUISettings(d, numberFormat, accentColor)}
                      className={`flex-1 rounded-md py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        layoutDensity === d
                          ? "bg-surface text-text border border-border/80 shadow-sm"
                          : "text-muted hover:text-text bg-transparent border border-transparent"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted">Indian Number Format</Label>
                <div className="flex gap-2 bg-surface-2 p-1 rounded-lg border border-border/50">
                  {(["lakh-crore", "absolute"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleSaveUISettings(layoutDensity, f, accentColor)}
                      className={`flex-1 rounded-md py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        numberFormat === f
                          ? "bg-surface text-text border border-border/80 shadow-sm"
                          : "text-muted hover:text-text bg-transparent border border-transparent"
                      }`}
                    >
                      {f === "lakh-crore" ? "₹ Lakh / Crore" : "Absolute (100k / 10m)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted">Accent Preset</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: "amber", color: "#f89c23", rawName: "amber" },
                    { name: "emerald", color: "#00d09c", rawName: "emerald" },
                    { name: "cyan", color: "#00bfa5", rawName: "cyan" },
                    { name: "monochrome", color: "#FFFFFF", rawName: "monochrome" },
                  ].map((preset) => {
                    const isSelected = accentColor === preset.rawName;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleSaveUISettings(layoutDensity, numberFormat, preset.rawName)}
                        className={`flex flex-col items-center justify-center rounded-lg border p-2.5 transition-all duration-300 ${
                          isSelected
                            ? "bg-surface-2 border-border/80 shadow-sm"
                            : "border-border/50 bg-surface/20 hover:bg-surface-3 hover:border-border"
                        }`}
                        style={isSelected ? { boxShadow: `0 0 12px ${preset.color}10`, borderColor: `${preset.color}40` } : undefined}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-border/60 transition-transform duration-200 group-hover:scale-110"
                          style={{
                            backgroundColor: preset.color,
                            boxShadow: isSelected ? `0 0 8px ${preset.color}60` : undefined,
                          }}
                        />
                        <span className="mt-1.5 text-[8px] uppercase font-bold text-muted-foreground">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
