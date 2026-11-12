// User-facing copy shared by the operations screens: API error codes, store state, substitution preference, timeline.
// Pure, so the wording can be tested.

export const RATE_LIMITED_COPY = "Too many requests, try again in a minute.";

const ERROR_COPY: Record<string, string> = {
  RATE_LIMITED: RATE_LIMITED_COPY,
  ORDER_ALREADY_ASSIGNED: "Another store accepted this order first.",
  ORDER_CANCELLED: "This order was cancelled.",
  OUT_OF_STOCK: "You do not have enough stock for every item in this order.",
  NOT_ELIGIBLE: "This order is not available to your store.",
  NOT_APPROVED: "Your store is not approved to do this yet.",
  NOT_FOUND: "This order is no longer available to your store.",
  INVALID_STATE: "This cannot be done for the order right now.",
  ITEMS_NOT_CHECKED: "Tick every item before marking the order packed.",
  PRODUCT_NOT_PUBLISHED: "One or more products are not on sale on GlowVai.",
  DAILY_LIMIT: "You have reached today's limit for product requests. Try again tomorrow.",
  UNAUTHENTICATED: "Your session has ended. Please sign in again.",
  INTERNAL: "Something went wrong on our side. Please try again.",
};

/** Friendly text for an API refusal. Falls back to the server's own sentence, then to a generic line. */
export function messageFor(err: unknown): string {
  const e = (err ?? {}) as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  if (code && ERROR_COPY[code]) return ERROR_COPY[code];
  if (typeof e.message === "string" && e.message) return e.message;
  return "Something went wrong. Please try again.";
}

export const SUBSTITUTION_COPY: Record<"ALLOW_SUBSTITUTE" | "NO_SUBSTITUTE" | "CALL_ME", { label: string; hint: string }> = {
  ALLOW_SUBSTITUTE: { label: "Similar product allowed", hint: "If an item is out of stock, the customer accepts a similar product." },
  NO_SUBSTITUTE: { label: "No substitutes", hint: "Do not send a different product. Report any missing item instead." },
  CALL_ME: { label: "Call the customer first", hint: "Do not change anything before the GlowVai team has called the customer." },
};

export const TIMELINE_LABELS: Record<"ACCEPTED" | "PACKED" | "HANDED_TO_RIDER", string> = {
  ACCEPTED: "Accepted",
  PACKED: "Packed",
  HANDED_TO_RIDER: "Handed to rider",
};

export type StoreStateName =
  | "NO_APPLICATION"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "DOCUMENTS_REQUESTED"
  | "REJECTED"
  | "APPROVED_ACTIVE"
  | "APPROVED_PAUSED"
  | "SUSPENDED";

export function storeStateCopy(state: StoreStateName | string): { title: string; body: string } {
  switch (state) {
    case "APPROVED_ACTIVE":
      return { title: "Store approved", body: "Go online to receive orders. You can finish orders you have accepted at any time." };
    case "APPROVED_PAUSED":
      return {
        title: "Paused by GlowVai",
        body: "GlowVai has paused your store, so you cannot go online right now. Orders you already accepted can still be finished.",
      };
    case "SUSPENDED":
      return { title: "Store suspended", body: "Your store is suspended. Contact GlowVai for help." };
    case "UNDER_REVIEW":
    case "SUBMITTED":
      return { title: "Application under review", body: "You can go online after GlowVai approves your store." };
    case "DOCUMENTS_REQUESTED":
      return { title: "Documents needed", body: "GlowVai has asked for more documents before your store can go online." };
    case "REJECTED":
      return { title: "Application not approved", body: "Your store cannot go online. Check your application for the reason." };
    default:
      return { title: "No store yet", body: "Submit your store application to start receiving orders." };
  }
}

export const DECLINE_SUCCESS = "Order declined. Other stores can still take it.";
export const ACCEPT_SUCCESS = "Order accepted. It is now yours to prepare.";
export const PACKED_SUCCESS = "Order marked packed.";
