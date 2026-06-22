"use client";

import { cn } from "@/lib/utils";

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-[var(--accent)]",
        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--accent) ${
          ((value - min) / (max - min)) * 100
        }%, var(--surface-2) ${((value - min) / (max - min)) * 100}%)`,
      }}
    />
  );
}
