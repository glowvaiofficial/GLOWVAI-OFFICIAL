// Saved payment methods on the server: the gate, the Razorpay customer, the token list and the preferred token. Only
// Razorpay ids are stored (users/{uid}/payments/profile). Brand and last four digits are read from Razorpay each time.
import "server-only";
import { db, json } from "../server";
import { readPaymentsProfile, writePaymentsProfile, type PaymentsProfile } from "../privacy/store";
import {
  GATE_OFF_MESSAGE,
  MAX_SAVED_METHODS,
  isCustomerId,
  resolvePreferred,
  viewOfToken,
  type SavedMethodView,
} from "./rules";
import { createRazorpayCustomer, listRazorpayTokens, RazorpayCallError } from "./razorpayCustomers";

export const env = (): Record<string, string | undefined> => process.env;

export function gateOff() {
  return json({ ok: false, enabled: false, error: GATE_OFF_MESSAGE }, 403);
}

export function razorpayFailure(err: unknown) {
  if (err instanceof RazorpayCallError && err.status === 503) return json({ ok: false, error: "Saved payment methods are not available yet." }, 503);
  return json({ ok: false, error: "Razorpay could not complete this. Try again in a moment." }, 502);
}

// The Razorpay customer for this account, created on first use. The customer holds the name, mobile and email the
// customer already gave GlowVai (Razorpay needs them for the card form). Nothing is kept here beyond the customer id.
export async function ensureCustomer(uid: string, profile: PaymentsProfile, now: number): Promise<string> {
  if (profile.razorpayCustomerId && isCustomerId(profile.razorpayCustomerId)) return profile.razorpayCustomerId;
  const snap = await db().collection("users").doc(uid).get();
  const d = (snap.data() ?? {}) as Record<string, unknown>;
  const contact = typeof d.phone === "string" ? d.phone.replace(/\D/g, "").slice(-10) : "";
  const id = await createRazorpayCustomer(env(), {
    name: typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 80) : "GlowVai customer",
    contact: /^[6-9]\d{9}$/.test(contact) ? `+91${contact}` : "",
    email: typeof d.email === "string" && d.email.includes("@") ? d.email.slice(0, 120) : undefined,
  });
  await writePaymentsProfile(uid, { razorpayCustomerId: id }, now);
  return id;
}

// The saved methods as Razorpay lists them now. The preferred flag is set only while the token is still listed.
export async function savedMethods(uid: string): Promise<{ methods: SavedMethodView[]; preferredTokenId: string | null; customerId: string | null }> {
  const profile = await readPaymentsProfile(uid);
  if (!profile.razorpayCustomerId) return { methods: [], preferredTokenId: null, customerId: null };
  const tokens = await listRazorpayTokens(env(), profile.razorpayCustomerId);
  const live = tokens.map((t) => t.id);
  const preferred = resolvePreferred(profile.preferredTokenId, live);
  const methods = tokens.map((t) => viewOfToken(t, preferred)).filter((m): m is SavedMethodView => m !== null).slice(0, MAX_SAVED_METHODS);
  return { methods, preferredTokenId: preferred, customerId: profile.razorpayCustomerId };
}

