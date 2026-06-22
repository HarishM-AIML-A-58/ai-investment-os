import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "pos" | "neg" | "warn" | "muted" | "accent" | "blue" | "purple" | "teal" | "pink" | "indigo";

const tones: Record<Tone, string> = {
  pos:    "bg-[var(--groww-green)]/10  text-[var(--groww-green)]  border-[var(--groww-green)]/25",
  neg:    "bg-[var(--groww-red)]/10    text-[var(--groww-red)]    border-[var(--groww-red)]/25",
  warn:   "bg-[var(--groww-orange)]/10 text-[var(--groww-orange)] border-[var(--groww-orange)]/25",
  accent: "bg-[var(--groww-purple)]/10 text-[var(--groww-purple)] border-[var(--groww-purple)]/25",
  blue:   "bg-[var(--groww-blue)]/10   text-[var(--groww-blue)]   border-[var(--groww-blue)]/25",
  purple: "bg-[var(--groww-purple)]/10 text-[var(--groww-purple)] border-[var(--groww-purple)]/25",
  teal:   "bg-[var(--groww-teal)]/10   text-[var(--groww-teal)]   border-[var(--groww-teal)]/25",
  pink:   "bg-[var(--groww-pink)]/10   text-[var(--groww-pink)]   border-[var(--groww-pink)]/25",
  indigo: "bg-[var(--groww-indigo)]/10 text-[var(--groww-indigo)] border-[var(--groww-indigo)]/25",
  muted:  "bg-surface-2 text-muted border-border",
};

export function Badge({
  tone = "muted",
  className,
  ...props
}: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
