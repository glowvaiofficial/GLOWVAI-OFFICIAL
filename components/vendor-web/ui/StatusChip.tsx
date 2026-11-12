import type { ChipTone } from "@/lib/vendor-web/copy";

const TONE: Record<ChipTone, string> = {
  ok: "bg-[#E7F7EE] text-[#136C3A]",
  warn: "bg-[#FFF4D6] text-[#7A5600]",
  bad: "bg-[#FDE8E6] text-[#9B2418]",
  info: "bg-[#EAF2FF] text-[#0B3B8F]",
  neutral: "bg-[#F1F2F4] text-ink-muted",
};

/** A small status label. The text carries the meaning; the colour only backs it up. */
export function StatusChip({ tone = "neutral", children }: { tone?: ChipTone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold ${TONE[tone]}`}>{children}</span>;
}
