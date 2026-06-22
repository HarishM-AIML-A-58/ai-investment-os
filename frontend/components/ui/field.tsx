import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[11px] font-medium uppercase tracking-wider text-muted", className)}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-[13px] text-text placeholder:text-muted/50 transition-colors focus:border-[var(--groww-purple)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--groww-purple)]/20 tabular",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
