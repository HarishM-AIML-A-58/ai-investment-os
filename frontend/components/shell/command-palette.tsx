"use client";

import { Command } from "cmdk";
import {
  Activity,
  BarChart3,
  Brain,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

const ITEMS = [
  { href: "/", label: "Command Deck", icon: LayoutDashboard },
  { href: "/recommendations", label: "Recommendations", icon: ListChecks },
  { href: "/analyze", label: "Analyze a symbol", icon: Sparkles },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/watchlist", label: "Watchlist", icon: Activity },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/memory", label: "Memory search", icon: Brain },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Control Room (settings)", icon: Settings },
];

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
        <Command className="overflow-hidden rounded-xl border border-border bg-surface shadow-glow">
          <Command.Input
            autoFocus
            placeholder="Jump to…"
            className="h-12 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted"
          />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="p-4 text-sm text-muted">
              No results.
            </Command.Empty>
            {ITEMS.map(({ href, label, icon: Icon }) => (
              <Command.Item
                key={href}
                value={label}
                onSelect={() => {
                  router.push(href);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted aria-selected:bg-surface-2 aria-selected:text-text"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
