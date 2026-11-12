// Errors from /api/vendor/* as the vendor page shows them. Friendly copy comes from this map, keyed by the server's code,
// so a code always reads the same on every screen. Pure: no Firebase or React imports, so tests can use it directly.

export const NETWORK_MESSAGE = "Can't reach GlowVai. Check your internet and try again.";
export const RATE_LIMIT_MESSAGE = "Too many requests, try again in a minute.";
export const GENERIC_MESSAGE = "Something went wrong on our side. Please try again.";

/** Friendly copy per server code (docs/VENDOR_API.md error codes). Codes not listed fall back to the server's text. */
export const VENDOR_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Your session has ended. Please sign in again.",
  NOT_A_VENDOR_ACCOUNT: "This account is not a GlowVai store account. Sign in with your store email and password.",
  EMAIL_NOT_VERIFIED: "Verify your email address first, then try again.",
  NOT_APPROVED: "Your store is not approved to do this yet.",
  APPLICATION_LOCKED: "Your application is being reviewed or is already approved, so it cannot be changed now.",
  ORDER_ALREADY_ASSIGNED: "Another store accepted this order first.",
  ORDER_CANCELLED: "This order was cancelled.",
  OUT_OF_STOCK: "You do not have enough stock for every item in this order.",
  NOT_ELIGIBLE: "This order is not available to your store.",
  NOT_FOUND: "We could not find that.",
  INVALID_INPUT: "Some details are missing or not valid.",
  INVALID_STATE: "This cannot be done right now.",
  ITEMS_NOT_CHECKED: "Check every item in the order before marking it packed.",
  PRODUCT_NOT_PUBLISHED: "One or more products are not on sale on GlowVai.",
  ORIGIN_NOT_ALLOWED: "This website is not allowed to use the GlowVai store API. Contact GlowVai support.",
  PAYLOAD_TOO_LARGE: "The request is too large.",
  RATE_LIMITED: RATE_LIMIT_MESSAGE,
  DAILY_LIMIT: "You have reached today's limit for this. Try again tomorrow.",
  INTERNAL: GENERIC_MESSAGE,
};

export type VendorApiErrorCode = string;

/** The friendly sentence for a code. `serverText` is used only for codes the map does not know. */
export function friendlyMessage(code: string, serverText?: string): string {
  if (code === "NETWORK") return NETWORK_MESSAGE;
  if (Object.prototype.hasOwnProperty.call(VENDOR_ERROR_MESSAGES, code)) return VENDOR_ERROR_MESSAGES[code];
  if (serverText && serverText.trim()) return serverText.trim().slice(0, 300);
  return GENERIC_MESSAGE;
}

/** Thrown by vendorFetch. `status` is 0 for a network failure. `details` carries the server's extra fields (field, missing, productIds). */
export class VendorApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "VendorApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isVendorApiError(err: unknown): err is VendorApiError {
  return err instanceof VendorApiError;
}

/** Message to show for any thrown value: vendor API errors get their friendly copy; anything else gets the generic one. */
export function messageForError(err: unknown): string {
  if (isVendorApiError(err)) return err.message;
  return GENERIC_MESSAGE;
}

/** A field name the server flagged (INVALID_INPUT), when present. */
export function fieldForError(err: unknown): string | null {
  if (!isVendorApiError(err)) return null;
  const f = err.details.field;
  return typeof f === "string" ? f : null;
}
