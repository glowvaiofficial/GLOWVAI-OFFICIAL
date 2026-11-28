import React from "react";
import { cn } from "@/lib/utils";

type Tone = "paper" | "deep" | "ink";
type Pad = "tight" | "md" | "open";

export function Section({
  id,
  tone = "paper",
  pad = "md",
  className,
  children,
  labelledBy,
  bleed = false,
}: {
  id?: string;
  tone?: Tone;
  pad?: Pad;
  className?: string;
  children: React.ReactNode;
  labelledBy?: string;
  bleed?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "scroll-mt-20",
        pad === "tight" && "py-12 sm:py-16 lg:py-20",
        pad === "md" && "py-16 sm:py-20 lg:py-28",
        pad === "open" && "py-24 sm:py-32 lg:py-44",
        tone === "paper" && "gv-tone-paper",
        tone === "deep" && "gv-tone-deep",
        tone === "ink" && "gv-tone-ink",
        className
      )}
    >
      {bleed ? children : <div className="gv-page">{children}</div>}
    </section>
  );
}

// Small mono label. Used on two sections only.
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-xs uppercase tracking-[0.12em] text-ink-muted", className)}>{children}</p>
  );
}

export function SectionTitle({
  id,
  children,
  className,
  tone = "light",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <h2
      id={id}
      className={cn(
        "font-display font-semibold text-[clamp(1.875rem,1.3rem+2.4vw,3rem)] leading-[1.08] tracking-[-0.02em]",
        tone === "dark" ? "text-white" : "text-ink",
        className
      )}
    >
      {children}
    </h2>
  );
}

export const focusRing =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand";
