import { Card } from "@/components/ui/card";

export function Stat({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      {/* Subtle colored glow at top */}
      {tone && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-xl"
          style={{ background: tone }}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-widest text-muted">
          {label}
        </div>
        {icon && (
          <div className="shrink-0 text-muted" style={tone ? { color: tone } : undefined}>
            {icon}
          </div>
        )}
      </div>
      <div
        className="tabular mt-3 text-3xl font-bold tracking-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[12px] text-muted">{hint}</div>
      )}
    </Card>
  );
}
