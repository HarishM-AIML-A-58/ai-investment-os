"use client";

import {
  Activity,
  BarChart3,
  Brain,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
  TrendingUp,
  Wallet,
  History,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/",               label: "Dashboard",       icon: LayoutDashboard },
      { href: "/recommendations",label: "Signals",          icon: ListChecks      },
      { href: "/analyze",        label: "Analyze",          icon: Sparkles        },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { href: "/portfolio",      label: "Holdings",         icon: Wallet          },
      { href: "/watchlist",      label: "Watchlist",        icon: Activity        },
      { href: "/performance",    label: "Performance",      icon: BarChart3       },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/signals",        label: "AI Signals",       icon: Zap             },
      { href: "/memory",         label: "Memory",           icon: Brain           },
      { href: "/reports",        label: "Reports",          icon: FileText        },
      { href: "/backtest",       label: "Backtest",         icon: History         },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings",       label: "Settings",         icon: Settings        },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-surface md:flex">
      {/* Logo */}
      <Link
        href="/"
        className="flex h-[60px] items-center gap-3 border-b border-border px-5 hover:opacity-90 transition-opacity"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
          <img src="/logo.png" alt="LinearTrade AI Logo" className="h-full w-full object-cover" />
        </div>
        <div>
          <div className="text-[14px] font-bold tracking-tight text-text leading-none">
            LinearTrade
          </div>
          <div className="text-[9px] font-semibold tracking-wider text-[var(--groww-purple)] leading-none mt-[4px] uppercase">
            AI Platform
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-100",
                      active
                        ? "bg-[var(--groww-purple)]/10 text-[var(--groww-purple)]"
                        : "text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    {/* Active left indicator */}
                    {active && (
                      <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-[var(--groww-purple)]" />
                    )}
                    <Icon
                      className={cn(
                        "h-[16px] w-[16px] shrink-0 transition-colors duration-100",
                        active ? "text-[var(--groww-purple)]" : "text-muted group-hover:text-text",
                      )}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    <span className="flex-1 leading-none">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — connection status */}
      <div className="border-t border-border px-4 py-3.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: "var(--groww-green)", animationDuration: "2s" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--groww-green)" }}
            />
          </span>
          <span className="text-[11px] font-medium text-muted">Groww Connected</span>
        </div>
        <div className="text-[10px] text-muted-2">Human-approved execution</div>
      </div>
    </aside>
  );
}
