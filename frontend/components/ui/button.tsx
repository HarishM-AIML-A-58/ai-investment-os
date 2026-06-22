"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groww-purple)]/40 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--groww-purple)] text-white hover:opacity-90 font-semibold shadow-sm",
        blue:
          "bg-[var(--groww-blue)] text-white hover:opacity-90 font-semibold shadow-sm",
        green:
          "bg-[var(--groww-green)] text-white hover:opacity-90 font-semibold shadow-sm",
        outline:
          "border border-border bg-transparent text-text hover:bg-surface-2 hover:border-border-2",
        ghost:
          "bg-transparent text-muted hover:text-text hover:bg-surface-2",
        danger:
          "bg-[var(--groww-red)]/10 text-[var(--groww-red)] border border-[var(--groww-red)]/30 hover:bg-[var(--groww-red)]/20",
      },
      size: {
        sm:   "h-7 px-3 text-[12px]",
        md:   "h-9 px-4",
        lg:   "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
