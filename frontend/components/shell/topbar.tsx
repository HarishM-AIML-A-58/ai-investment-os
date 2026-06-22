"use client";

import { Search } from "lucide-react";
import * as React from "react";
import { CommandPalette } from "@/components/shell/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { useApiHealth } from "@/lib/use-health";

type IndexDatum = { label: string; price: number; change: number; changePct: number; up: boolean };

const INIT: IndexDatum[] = [
  { label: "NIFTY 50",   price: 0, change: 0, changePct: 0, up: true },
  { label: "SENSEX",     price: 0, change: 0, changePct: 0, up: true },
  { label: "BANKNIFTY",  price: 0, change: 0, changePct: 0, up: true },
  { label: "MIDCPNIFTY", price: 0, change: 0, changePct: 0, up: true },
  { label: "FINNIFTY",   price: 0, change: 0, changePct: 0, up: true },
  { label: "NIFTYIT",    price: 0, change: 0, changePct: 0, up: true },
];

function fmtPrice(n: number) {
  if (!n) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function IndexChip({ label, price, change, changePct, up }: IndexDatum) {
  const sign = change >= 0 ? "+" : "";
  const changeStr = price
    ? `${sign}${Math.abs(change).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${Math.abs(changePct).toFixed(2)}%)`
    : "—";

  return (
    <div className="flex items-center gap-2.5 px-4 shrink-0">
      <span className="text-[11px] font-semibold text-muted whitespace-nowrap">{label}</span>
      <span className="tabular text-[11px] font-semibold text-text whitespace-nowrap">{fmtPrice(price)}</span>
      <span
        className="tabular text-[11px] font-medium whitespace-nowrap"
        style={{ color: up ? "var(--groww-green)" : "var(--groww-red)" }}
      >
        {changeStr}
      </span>
    </div>
  );
}

export function Topbar() {
  const [open, setOpen] = React.useState(false);
  const [indices, setIndices] = React.useState<IndexDatum[]>(INIT);
  const healthy = useApiHealth();

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/market");
        if (!res.ok) return;
        const data: IndexDatum[] = await res.json();
        if (Array.isArray(data) && data.length > 0) setIndices(data);
      } catch {}
    }
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex flex-col shrink-0 border-b border-border bg-surface">
      {/* Market indices ticker strip — live, refreshes every 60s */}
      <div className="flex items-center h-9 border-b border-border overflow-hidden bg-surface-2/50">
        <div className="flex ticker-track">
          {[...indices, ...indices].map((idx, i) => (
            <React.Fragment key={i}>
              <IndexChip {...idx} />
              <span className="text-border-2 text-[11px] select-none">·</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main topbar row */}
      <div className="flex h-[52px] items-center gap-4 px-5">
        {/* API Status */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                healthy ? "animate-ping" : ""
              }`}
              style={{ backgroundColor: healthy ? "var(--groww-green)" : "var(--groww-red)" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: healthy ? "var(--groww-green)" : "var(--groww-red)" }}
            />
          </span>
          <span className="text-[12px] font-medium text-muted">
            {healthy ? "API Live" : "API Offline"}
          </span>
        </div>

        <div className="flex-1" />

        {/* Groww-style search bar */}
        <button
          id="topbar-command-btn"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-[12px] text-muted transition-all hover:border-[var(--groww-purple)]/50 hover:text-text min-w-[220px]"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="flex items-center gap-0.5 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-2">
            ⌘K
          </kbd>
        </button>

        <ThemeToggle />
        <CommandPalette open={open} setOpen={setOpen} />
      </div>
    </header>
  );
}
