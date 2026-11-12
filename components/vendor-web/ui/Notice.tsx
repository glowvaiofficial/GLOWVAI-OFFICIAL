import type { ReactNode } from "react";
import { Button } from "./Button";

export type NoticeTone = "error" | "warning" | "info" | "success";

const TONE: Record<NoticeTone, string> = {
  error: "border-[#F3C4C0] bg-[#FDF1F0] text-[#7A1F17]",
  warning: "border-[#F3DEA8] bg-[#FFF8E6] text-[#5C4400]",
  info: "border-[#BFD4FF] bg-[#EAF2FF] text-[#0B3B8F]",
  success: "border-[#B7E4C7] bg-[#EDF9F1] text-[#14532D]",
};

/**
 * A plain-language message. Errors use role="alert". `onRetry` adds a Retry button; it is disabled while `retrying`.
 * Text is rendered as React text only, so server strings are never treated as markup.
 */
export function Notice({
  tone = "error",
  title,
  children,
  onRetry,
  retrying = false,
  retryLabel = "Try again",
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3.5 ${TONE[tone]}`}>
      {title ? <p className="text-[15px] font-semibold">{title}</p> : null}
      {children ? <div className={`text-[14px] leading-relaxed ${title ? "mt-1" : ""}`}>{children}</div> : null}
      {onRetry ? (
        <div className="mt-3">
          <Button variant="secondary" onClick={onRetry} loading={retrying} className="!min-h-[44px] bg-white">
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
