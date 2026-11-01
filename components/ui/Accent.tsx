import React from "react";
import { cn } from "@/lib/utils";

interface AccentProps {
  children: React.ReactNode;
  underline?: boolean;
  className?: string;
}

// Highlights a word in the brand blue. (The old italic serif accent is retired.)
export function Accent({ children, className }: AccentProps) {
  return <span className={cn("text-brand", className)}>{children}</span>;
}
