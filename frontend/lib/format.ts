export function inr(value: number | string, compact = true): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  if (compact) {
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  }
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function bandColor(action: string): string {
  const a = action.toLowerCase();
  if (a === "buy") return "var(--pos)";
  if (a === "avoid") return "var(--neg)";
  return "var(--warn)";
}

export function statusTone(status: string): "pos" | "neg" | "warn" | "muted" {
  if (status === "guard_passed") return "pos";
  if (status === "executed") return "pos";
  if (status.startsWith("blocked")) return "warn";
  if (status === "rejected") return "neg";
  return "muted";
}
