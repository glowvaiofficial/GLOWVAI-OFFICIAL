// Razorpay's customer and token APIs, called from the server with the account keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET).
// Card data never comes through here: Razorpay Checkout collects the card on Razorpay's page, and Razorpay keeps it and
// returns a token id. This module only creates the Razorpay customer, lists and deletes tokens, and reads a payment to
// check that a saved card belongs to the customer. `fetchImpl` is injectable so the tests can run without a network.
import type { RazorpayToken } from "./rules";

const BASE = "https://api.razorpay.com/v1";

export class RazorpayCallError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

function authHeader(env: Record<string, string | undefined>): string {
  const keyId = env.RAZORPAY_KEY_ID;
  const secret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new RazorpayCallError(503, "NOT_CONFIGURED");
  return "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64");
}

async function call<T>(
  env: Record<string, string | undefined>,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body: Record<string, unknown> | null,
  fetchImpl: FetchLike,
): Promise<T> {
  const res = await fetchImpl(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: authHeader(env) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { description?: string } } & T;
  if (!res.ok) throw new RazorpayCallError(res.status, data.error?.description || "Razorpay could not complete the request.");
  return data;
}

// Creates the Razorpay customer for a GlowVai customer. Only the details the card form needs are sent.
export async function createRazorpayCustomer(
  env: Record<string, string | undefined>,
  input: { name: string; contact: string; email?: string },
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const data = await call<{ id?: string }>(env, "POST", "/customers", { name: input.name, contact: input.contact, email: input.email || undefined, fail_existing: 0 }, fetchImpl);
  if (!data.id) throw new RazorpayCallError(502, "Razorpay did not return a customer.");
  return data.id;
}

export async function listRazorpayTokens(env: Record<string, string | undefined>, customerId: string, fetchImpl: FetchLike = fetch): Promise<RazorpayToken[]> {
  const data = await call<{ items?: RazorpayToken[] }>(env, "GET", `/customers/${customerId}/tokens`, null, fetchImpl);
  return Array.isArray(data.items) ? data.items : [];
}

export async function deleteRazorpayToken(env: Record<string, string | undefined>, customerId: string, tokenId: string, fetchImpl: FetchLike = fetch): Promise<void> {
  await call(env, "DELETE", `/customers/${customerId}/tokens/${tokenId}`, null, fetchImpl);
}

// The order a card is saved against. Razorpay needs an amount, so the setup amount comes from
// PAYMENT_METHODS_SETUP_AMOUNT_PAISE (default 100 paise, the Razorpay minimum). Whether that amount is refunded after a
// save is a business decision for the owner; this code does not refund anything.
export async function createSetupOrder(
  env: Record<string, string | undefined>,
  input: { customerId: string; amountPaise: number; receipt: string },
  fetchImpl: FetchLike = fetch,
): Promise<{ id: string }> {
  const data = await call<{ id?: string }>(
    env,
    "POST",
    "/orders",
    { amount: input.amountPaise, currency: "INR", customer_id: input.customerId, receipt: input.receipt.slice(0, 40), notes: { purpose: "save_payment_method" } },
    fetchImpl,
  );
  if (!data.id) throw new RazorpayCallError(502, "Razorpay did not return an order.");
  return { id: data.id };
}

export async function fetchRazorpayPayment(
  env: Record<string, string | undefined>,
  paymentId: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ id?: unknown; order_id?: unknown; customer_id?: unknown; token_id?: unknown; status?: unknown }> {
  return call(env, "GET", `/payments/${paymentId}`, null, fetchImpl);
}
