// Error codes the vendor API returns as { ok: false, error, code }. The app maps each code to its own copy, so codes
// never change meaning. `error` is a friendly sentence that is safe to show as is; internal details are only logged.

export type VendorErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_A_VENDOR_ACCOUNT"
  | "EMAIL_NOT_VERIFIED"
  | "NOT_APPROVED"
  | "APPLICATION_LOCKED"
  | "ORDER_ALREADY_ASSIGNED"
  | "ORDER_CANCELLED"
  | "OUT_OF_STOCK"
  | "NOT_ELIGIBLE"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "INVALID_STATE"
  | "ITEMS_NOT_CHECKED"
  | "PRODUCT_NOT_PUBLISHED"
  | "ORIGIN_NOT_ALLOWED"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL";

const DEFAULT_COPY: Record<VendorErrorCode, string> = {
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
  INVALID_STATE: "This cannot be done for the order right now.",
  ITEMS_NOT_CHECKED: "Check every item in the order before marking it packed.",
  PRODUCT_NOT_PUBLISHED: "One or more products are not on sale on GlowVai.",
  ORIGIN_NOT_ALLOWED: "This website is not allowed to use the GlowVai vendor API.",
  PAYLOAD_TOO_LARGE: "The request is too large.",
  RATE_LIMITED: "Too many requests. Please wait a minute and try again.",
  INTERNAL: "Something went wrong on our side. Please try again.",
};

/** A refusal the API returns to the app. Thrown from route work and turned into a JSON response by the route wrapper. */
export class VendorError extends Error {
  readonly code: VendorErrorCode;
  readonly status: number;
  readonly extra: Record<string, unknown>;
  constructor(code: VendorErrorCode, status: number, message?: string, extra: Record<string, unknown> = {}) {
    super(message || DEFAULT_COPY[code]);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

/** The JSON body of a refusal: { ok: false, error, code, ...extra }. Extra fields never override the three keys. */
export function errorBody(err: VendorError): Record<string, unknown> {
  return { ...err.extra, ok: false, error: err.message, code: err.code };
}

export const invalid = (message: string, extra: Record<string, unknown> = {}) => new VendorError("INVALID_INPUT", 400, message, extra);
