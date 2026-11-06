// Delivery slots offered at checkout. Pure: the server computes the slots from the clock, the client only shows what the
// server offers, and the order route refuses any slot that is not offered at the moment the order is placed.
//
// Promises: "Now" is offered only while the shop is open. Time windows are estimates, not promises; the label says so.
// All shop hours are Indian Standard Time (UTC+05:30, no daylight saving).

export const SHOP_HOURS = { timezone: "Asia/Kolkata", openHour: 9, closeHour: 22 } as const;

export const SLOT_CONFIG = {
  // A window on the same day must start at least this many minutes from now.
  leadMinutes: 60,
  express: { id: "express-now", label: "Now (express, 10–20 min)", minMinutes: 10, maxMinutes: 20 },
  windows: [
    { id: "morning", label: "Morning", startHour: 9, endHour: 12 },
    { id: "afternoon", label: "Afternoon", startHour: 12, endHour: 16 },
    { id: "evening", label: "Evening", startHour: 16, endHour: 20 },
    { id: "night", label: "Night", startHour: 20, endHour: 22 },
  ],
} as const;

export type SlotKind = "express" | "window";
export type SlotDay = "today" | "tomorrow";

export interface DeliverySlot {
  id: string;
  kind: SlotKind;
  day: SlotDay;
  label: string;
  estimate: string;
  startsAt: number;
  endsAt: number;
}

const IST_OFFSET_MS = 5.5 * 3600_000;

// The IST calendar date and hour of an instant, computed without Intl so it is the same on every server.
export function istClock(now: number): { year: number; month: number; day: number; hour: number; minute: number } {
  const d = new Date(now + IST_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

// The instant at which the IST calendar day (offset by dayOffset) reaches the given IST hour.
export function istInstant(now: number, dayOffset: number, hour: number): number {
  const c = istClock(now);
  return Date.UTC(c.year, c.month, c.day + dayOffset, hour) - IST_OFFSET_MS;
}

export function isShopOpen(now: number): boolean {
  const { hour } = istClock(now);
  return hour >= SHOP_HOURS.openHour && hour < SHOP_HOURS.closeHour;
}

const hourLabel = (hour: number): string => {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? "AM" : "PM"}`;
};

const windowRange = (startHour: number, endHour: number): string => `${hourLabel(startHour)} – ${hourLabel(endHour)}`;

// Every slot the customer may choose right now, in display order. Empty when the shop is closed and no window is left.
export function offeredSlots(now: number): DeliverySlot[] {
  const slots: DeliverySlot[] = [];
  const { express, windows, leadMinutes } = SLOT_CONFIG;
  if (isShopOpen(now)) {
    slots.push({
      id: express.id,
      kind: "express",
      day: "today",
      label: express.label,
      estimate: `Estimated ${express.minMinutes}–${express.maxMinutes} minutes`,
      startsAt: now,
      endsAt: now + express.maxMinutes * 60_000,
    });
  }
  const earliest = now + leadMinutes * 60_000;
  for (const dayOffset of [0, 1] as const) {
    const day: SlotDay = dayOffset === 0 ? "today" : "tomorrow";
    for (const w of windows) {
      const startsAt = istInstant(now, dayOffset, w.startHour);
      const endsAt = istInstant(now, dayOffset, w.endHour);
      if (dayOffset === 0 && startsAt < earliest) continue;
      slots.push({
        id: `${day}-${w.id}`,
        kind: "window",
        day,
        label: `${day === "today" ? "Today" : "Tomorrow"}, ${w.label}`,
        estimate: `Estimated ${windowRange(w.startHour, w.endHour)}`,
        startsAt,
        endsAt,
      });
    }
  }
  return slots;
}

// The offered slot with this id, or null when it is not offered now (unknown, closed, passed, or too soon).
export function findOfferedSlot(id: string, now: number): DeliverySlot | null {
  return offeredSlots(now).find((s) => s.id === id) ?? null;
}
