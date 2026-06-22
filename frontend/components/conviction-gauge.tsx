"use client";

import { motion } from "framer-motion";

function color(v: number): string {
  if (v >= 75) return "var(--groww-green)";
  if (v >= 50) return "var(--groww-orange)";
  return "var(--groww-red)";
}

export function ConvictionGauge({
  value,
  size = 180,
}: {
  value: number;
  size?: number;
}) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const pctArc = 0.75; // 270° gauge
  const filled = (Math.min(100, Math.max(0, value)) / 100) * pctArc;
  const col = color(value);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={10}
          strokeDasharray={`${c * pctArc} ${c}`}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${c * filled} ${c}`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${c * filled} ${c}` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 10px ${col}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tabular text-4xl font-bold tracking-tight"
          style={{ color: col }}
        >
          {value.toFixed(0)}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted mt-0.5">
          Conviction
        </span>
      </div>
    </div>
  );
}
