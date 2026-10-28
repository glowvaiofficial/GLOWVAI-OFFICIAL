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
    skymist: "bg-skymist text-brand border border-brand/15",
    blush: "bg-blush text-ink border border-ink/10",
    mint: "bg-mint text-ink border border-ink/10",
    yellow: "bg-yellow text-ink font-semibold",
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
