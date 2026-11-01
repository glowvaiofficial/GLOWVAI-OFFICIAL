import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "skymist" | "blush" | "mint" | "yellow" | "brand" | "coral" | "outline";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export function Badge({
  variant = "skymist",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    skymist: "bg-paper-deep text-brand border border-ink/20",
    blush: "bg-paper-deep text-ink border border-ink/10",
    mint: "bg-paper-deep text-ink border border-ink/10",
    yellow: "bg-paper-deep text-ink font-semibold",
    brand: "bg-brand text-white font-semibold",
    coral: "bg-ink text-white font-semibold",
    outline: "border border-ink/20 text-ink-muted bg-white",
  };

  const sizes = {
    sm: "text-[11px] px-2.5 py-0.5 font-medium rounded-full",
    md: "text-xs px-3 py-1 font-semibold rounded-full",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
