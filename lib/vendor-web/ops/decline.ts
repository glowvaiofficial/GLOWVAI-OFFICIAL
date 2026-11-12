// Decline reasons. "OTHER" needs a note of 3 to 200 characters (after trimming), as the server enforces. Pure.

export const DECLINE_REASONS = ["OUT_OF_STOCK", "STORE_BUSY", "CLOSING_SOON", "ITEM_DAMAGED", "OTHER"] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const DECLINE_LABELS: Record<DeclineReason, string> = {
  OUT_OF_STOCK: "Out of stock",
  STORE_BUSY: "Store is busy",
  CLOSING_SOON: "Closing soon",
  ITEM_DAMAGED: "Item damaged",
  OTHER: "Other",
};

export const DECLINE_NOTE_MIN = 3;
export const DECLINE_NOTE_MAX = 200;

/** Why the note is not acceptable, or null when the decline can be sent. */
export function declineNoteError(reason: DeclineReason, note: string): string | null {
  if (reason !== "OTHER") return null;
  const n = note.trim().length;
  if (n < DECLINE_NOTE_MIN) return `Add a short note, at least ${DECLINE_NOTE_MIN} characters, when the reason is Other.`;
  if (n > DECLINE_NOTE_MAX) return `The note can be up to ${DECLINE_NOTE_MAX} characters.`;
  return null;
}

export function declineBody(reason: DeclineReason, note: string): { reason: DeclineReason; note?: string } {
  return reason === "OTHER" ? { reason, note: note.trim() } : { reason };
}
