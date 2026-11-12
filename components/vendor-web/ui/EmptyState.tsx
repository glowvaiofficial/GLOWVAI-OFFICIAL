import type { ReactNode } from "react";

/** Shown when a list or section has nothing yet. `action` is an optional button or link. */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-10 text-center">
      <p className="text-[16px] font-semibold text-ink">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
