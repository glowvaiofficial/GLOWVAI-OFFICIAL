import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-3.5 max-w-3xl mb-10 md:mb-16",
        align === "center" && "mx-auto text-center",
        align === "right" && "ml-auto text-right",
        className
      )}
    >
      {eyebrow && (
        <div>
          <Badge variant="skymist" size="md">
            {eyebrow}
          </Badge>
        </div>
      )}
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink tracking-tight text-tighter leading-[1.12]">
        {title}
      </h2>
      {description && (
        <p className="text-base sm:text-lg text-ink-muted leading-relaxed font-normal pt-1">
          {description}
        </p>
      )}
    </div>
  );
}
