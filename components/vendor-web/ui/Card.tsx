import type { ReactNode } from "react";

/** White card with a hairline border. `title` is an optional heading inside it. */
export function Card({ title, description, children, className = "", id }: { title?: string; description?: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-2xl border border-black/10 bg-white p-5 sm:p-6 ${className}`.trim()}>
      {title ? <h2 className="text-[17px] font-semibold text-ink">{title}</h2> : null}
      {description ? <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{description}</p> : null}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
