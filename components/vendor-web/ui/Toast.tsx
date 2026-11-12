"use client";

import { useEffect } from "react";

/**
 * A short confirmation at the bottom of the screen. It clears itself after `durationMs` and can be dismissed earlier.
 * Keep the message in state in the parent: render <Toast> only while there is something to say.
 */
export function Toast({ message, tone = "success", onDismiss, durationMs = 4000 }: { message: string; tone?: "success" | "error"; onDismiss: () => void; durationMs?: number }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [onDismiss, durationMs, message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold text-white shadow-lg md:bottom-6 ${
        tone === "error" ? "bg-[#B42318]" : "bg-ink"
      }`}
    >
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="min-h-[44px] min-w-[44px] rounded-lg px-2 text-white/90 underline underline-offset-2">
        Close
      </button>
    </div>
  );
}
