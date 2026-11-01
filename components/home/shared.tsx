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
        pad === "tight" && "py-10 sm:py-12 lg:py-16",
        pad === "md" && "py-14 sm:py-[72px] lg:py-24",
        pad === "open" && "py-20 sm:py-28 lg:py-40",
        tone === "paper" && "bg-paper",
        tone === "deep" && "bg-paper-deep",
        tone === "ink" && "bg-ink text-white",
        className
      )}
    >
      {bleed ? children : <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12">{children}</div>}
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
