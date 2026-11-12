// Saved payment methods: the feature gate, the id formats, what the customer sees of a saved token, and the preferred
// token rule. Pure functions only. GlowVai never sees a card number: it stores Razorpay's customer id and token ids, and
// shows the brand and last four digits (or the UPI handle) exactly as Razorpay returns them on each request.

export const GATE_OFF_MESSAGE = "Saved payment methods are not available yet.";
export const MAX_SAVED_METHODS = 10;

// The feature is on only when the server setting is exactly "true". Anything else keeps it off.
export function paymentMethodsEnabled(env: Record<string, string | undefined>): boolean {
  return env.PAYMENT_METHODS_SAVE_ENABLED === "true";
}

export const isCustomerId = (v: unknown): v is string => typeof v === "string" && /^cust_[A-Za-z0-9]{6,64}$/.test(v);
export const isTokenId = (v: unknown): v is string => typeof v === "string" && /^token_[A-Za-z0-9]{6,64}$/.test(v);
export const isPaymentId = (v: unknown): v is string => typeof v === "string" && /^pay_[A-Za-z0-9]{6,64}$/.test(v);

// The subset of a Razorpay token object this code reads. Only these fields are ever shown.
export interface RazorpayToken {
  id: string;
  method?: string;
  card?: { network?: unknown; last4?: unknown; issuer?: unknown };
  vpa?: { username?: unknown; handle?: unknown };
}

export interface SavedMethodView {
  id: string;
  kind: "card" | "upi";
  label: string;
  preferred: boolean;
}

const clean = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[^\w .@-]/g, "").slice(0, max) : "");

// A card shows its brand and last four digits; a UPI handle shows the VPA. Anything else is left out of the list.
export function viewOfToken(t: RazorpayToken, preferredTokenId: string | null): SavedMethodView | null {
  if (!isTokenId(t.id)) return null;
  const preferred = t.id === preferredTokenId;
  if (t.card && typeof t.card === "object") {
    const network = clean(t.card.network, 20) || "Card";
    const last4 = clean(t.card.last4, 4).replace(/\D/g, "");
    if (!/^\d{4}$/.test(last4)) return null;
    return { id: t.id, kind: "card", label: `${network} ending ${last4}`, preferred };
  }
  if (t.vpa && typeof t.vpa === "object") {
    const user = clean(t.vpa.username, 60);
    const handle = clean(t.vpa.handle, 40);
    if (!user || !handle) return null;
    return { id: t.id, kind: "upi", label: `${user}@${handle}`, preferred };
  }
  return null;
}

// The preferred token only counts while Razorpay still lists it for this customer. Otherwise there is no preferred method.
export function resolvePreferred(preferredTokenId: string | null, liveTokenIds: string[]): string | null {
  return preferredTokenId && liveTokenIds.includes(preferredTokenId) ? preferredTokenId : null;
}

// Removing the preferred method clears the preference. Removing any other method leaves it as it was.
export function preferredAfterRemoval(preferredTokenId: string | null, removedTokenId: string): string | null {
  return preferredTokenId === removedTokenId ? null : preferredTokenId;
}

// Setting a preferred method: it must be one of the customer's live tokens, or null to clear the choice.
export function choosePreferred(input: unknown, liveTokenIds: string[]): { ok: true; tokenId: string | null } | { ok: false; error: string } {
  if (input === null) return { ok: true, tokenId: null };
  if (!isTokenId(input) || !liveTokenIds.includes(input)) return { ok: false, error: "That payment method is not saved on your account." };
  return { ok: true, tokenId: input };
}

// A payment that proves a card was saved for this customer: it belongs to the customer, to the setup order we created,
// it reached a successful state, and Razorpay reports the token it created.
export function savedTokenFromPayment(
  payment: { id?: unknown; order_id?: unknown; customer_id?: unknown; token_id?: unknown; status?: unknown },
  expected: { customerId: string; orderId: string },
): { ok: true; tokenId: string } | { ok: false; error: string } {
  if (payment.customer_id !== expected.customerId) return { ok: false, error: "This payment is not linked to your account." };
  if (payment.order_id !== expected.orderId) return { ok: false, error: "This payment does not match the card you are saving." };
  if (payment.status !== "captured" && payment.status !== "authorized") return { ok: false, error: "The card could not be saved. Try again." };
  if (!isTokenId(payment.token_id)) return { ok: false, error: "Razorpay did not save this card. Try again." };
  return { ok: true, tokenId: payment.token_id };
}
