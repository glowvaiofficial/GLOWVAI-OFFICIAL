// Time and money formatting for the operations screens (India: IST day boundaries, rupee amounts). Pure.

const IST_OFFSET_MS = 19_800_000;
const DAY_MS = 86_400_000;

/** Start of the IST calendar day that contains `now`, as epoch ms. */
export function istDayStart(now: number): number {
  return Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

export function minutesAgo(ts: number, now: number): number {
  return Math.max(0, Math.floor((now - ts) / 60_000));
}

export function placedAgoLabel(ts: number, now: number): string {
  const m = minutesAgo(ts, now);
  return m < 1 ? "Placed just now" : `Placed ${m} min ago`;
}

export function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

/** Seconds as "45 s" or "2 min 5 s"; null when there is nothing to divide yet. */
export function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "No data yet";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m} min ${s} s` : `${m} min`;
}
