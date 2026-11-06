// Refund rules for shop orders, shared by the internal refund route (called by the GlowVai admin panel) and the
// Razorpay webhook. No server-only imports, so the unit tests (__tests__/refunds) can load it directly.
//
// Money is worked out in paise (whole numbers) so partial refunds never drift by a rounding error.
import { createHmac, timingSafeEqual } from "node:crypto";

type Row = Record<string, unknown>;

// ── Server-to-server signature ──────────────────────────────────────────────────────────────────────────────────────
// The admin panel signs `${timestamp}.${rawBody}` with HMAC-SHA256 and the shared INTERNAL_API_SECRET. The timestamp is
// milliseconds since the epoch and must be within 5 minutes of the shop's clock, so a captured request cannot be
// replayed later (a replay inside the window is harmless: refunds are idempotent on requestId).
export const SIGNATURE_HEADER = "x-glowvai-signature";
export const TIMESTAMP_HEADER = "x-glowvai-timestamp";
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const MIN_SECRET_LENGTH = 32;

// The shared secret, or null when it is missing or too short to be safe (the route then refuses with 503).
export function internalSecret(env: Record<string, string | undefined> = process.env): string | null {
  const secret = (env.INTERNAL_API_SECRET ?? "").trim();
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

export function signInternalRequest(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export type VerifyResult = { ok: true } | { ok: false; reason: "MISSING" | "STALE" | "BAD_SIGNATURE" };

export function verifyInternalRequest(input: { secret: string; timestamp: string | null; signature: string | null; rawBody: string; now: number }): VerifyResult {
  const timestamp = (input.timestamp ?? "").trim();
  const signature = (input.signature ?? "").trim().toLowerCase();
  if (!timestamp || !signature) return { ok: false, reason: "MISSING" };
  if (!/^\d{12,16}$/.test(timestamp) || Math.abs(input.now - Number(timestamp)) > MAX_CLOCK_SKEW_MS) return { ok: false, reason: "STALE" };
  if (!/^[0-9a-f]{64}$/.test(signature)) return { ok: false, reason: "BAD_SIGNATURE" };
  const expected = Buffer.from(signInternalRequest(input.secret, timestamp, input.rawBody), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given) ? { ok: true } : { ok: false, reason: "BAD_SIGNATURE" };
}

// ── Refund entries and amounts ──────────────────────────────────────────────────────────────────────────────────────
// REQUESTED: saved before Razorpay is called (so a retry or a parallel call never refunds twice).
// PENDING / PROCESSED / FAILED: Razorpay's own refund states.
export type RefundStatus = "REQUESTED" | "PENDING" | "PROCESSED" | "FAILED";

export interface RefundEntry {
  requestId: string;
  razorpayRefundId: string | null;
  amount: number; // rupees
  amountPaise: number;
  status: RefundStatus;
  reason: string;
  at: number;
  updatedAt: number;
  error: string | null;
  source: "admin" | "razorpay";
}

export const MAX_REFUNDS_PER_ORDER = 50;
export const MIN_REFUND_PAISE = 100; // Razorpay does not refund less than ₹1.
// Payment states that mean money was captured, so a refund is possible.
export const CAPTURED_STATES = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);

export const toPaise = (rupees: number): number => Math.round(rupees * 100);
export const toRupees = (paise: number): number => Math.round(paise) / 100;

export function refundsOf(order: Row | null | undefined): RefundEntry[] {
  const list = order?.refunds;
  return Array.isArray(list) ? (list.filter((r) => r && typeof r === "object" && typeof (r as Row).requestId === "string") as RefundEntry[]) : [];
}

function entryPaise(r: RefundEntry): number {
  const p = Number(r.amountPaise);
  return Number.isFinite(p) && p > 0 ? Math.round(p) : toPaise(Number(r.amount) || 0);
}

// What the customer paid, in paise.
export function capturedPaise(order: Row | null | undefined): number {
  const pricing = (order?.pricing ?? {}) as Row;
  const total = Number(pricing.grandTotal);
  return Number.isFinite(total) && total > 0 ? toPaise(total) : 0;
}

// Money already promised back: every refund that has not failed, including one still being sent.
export function committedPaise(refunds: RefundEntry[]): number {
  return refunds.filter((r) => r.status !== "FAILED").reduce((sum, r) => sum + entryPaise(r), 0);
}

export function refundablePaise(order: Row | null | undefined): number {
  return Math.max(0, capturedPaise(order) - committedPaise(refundsOf(order)));
}

// The order's payment status from the refunds Razorpay has accepted (pending or processed).
export function paymentStatusAfter(order: Row | null | undefined, refunds: RefundEntry[]): "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" {
  const accepted = refunds.filter((r) => r.status === "PENDING" || r.status === "PROCESSED").reduce((sum, r) => sum + entryPaise(r), 0);
  if (accepted <= 0) return "PAID";
  return accepted >= capturedPaise(order) ? "REFUNDED" : "PARTIALLY_REFUNDED";
}

// ── Request validation ──────────────────────────────────────────────────────────────────────────────────────────────
export interface RefundRequest {
  orderId: string;
  amountPaise: number;
  reason: string;
  requestId: string;
}

export function parseRefundRequest(body: unknown): { ok: true; value: RefundRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Row;
  const orderId = typeof b.orderId === "string" ? b.orderId.trim() : "";
  const requestId = typeof b.requestId === "string" ? b.requestId.trim() : "";
  const reason = typeof b.reason === "string" ? b.reason.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  const amount = typeof b.amount === "number" ? b.amount : Number.NaN;
  if (!/^[A-Za-z0-9_-]{1,140}$/.test(orderId)) return { ok: false, error: "orderId is missing or invalid." };
  if (!/^[A-Za-z0-9_.:-]{8,100}$/.test(requestId)) return { ok: false, error: "requestId must be 8 to 100 letters, digits or - _ . :" };
  if (!reason) return { ok: false, error: "A reason is required." };
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
    return { ok: false, error: "amount must be a positive number of rupees with at most 2 decimals." };
  }
  return { ok: true, value: { orderId, requestId, reason, amountPaise: Math.round(amount * 100) } };
}

// ── Deciding what to do ─────────────────────────────────────────────────────────────────────────────────────────────
export type RefundPlan =
  | { kind: "existing"; entry: RefundEntry; paymentId: string }
  | { kind: "create"; entry: RefundEntry; paymentId: string }
  | { kind: "error"; status: number; code: string; message: string; refundable?: number };

export function planRefund(order: Row | null | undefined, req: RefundRequest, now: number): RefundPlan {
  if (!order) return { kind: "error", status: 404, code: "ORDER_NOT_FOUND", message: `Order ${req.orderId} was not found.` };
  const payment = (order.payment ?? {}) as Row;
  const paymentId = typeof payment.paymentId === "string" ? payment.paymentId : "";
  const refunds = refundsOf(order);
  const existing = refunds.find((r) => r.requestId === req.requestId);
  if (existing) {
    if (entryPaise(existing) !== req.amountPaise) {
      return { kind: "error", status: 409, code: "REQUEST_ID_REUSED", message: "This requestId was already used for a different amount." };
    }
    return { kind: "existing", entry: existing, paymentId };
  }
  const method = String(payment.method ?? "COD").toUpperCase();
  if (method === "COD") {
    return { kind: "error", status: 409, code: "COD_MANUAL_REFUND", message: "This is a cash on delivery order. Refund the cash by hand, then mark the refund done in the admin panel." };
  }
  if (method !== "ONLINE") return { kind: "error", status: 409, code: "NOT_ONLINE", message: "Only online payments can be refunded through Razorpay." };
  if (!paymentId || !CAPTURED_STATES.has(String(payment.status ?? ""))) {
    return { kind: "error", status: 409, code: "PAYMENT_NOT_CAPTURED", message: "This order has no captured Razorpay payment to refund." };
  }
  if (req.amountPaise < MIN_REFUND_PAISE) return { kind: "error", status: 400, code: "AMOUNT_TOO_LOW", message: "Razorpay refunds must be at least ₹1." };
  const refundable = refundablePaise(order);
  if (req.amountPaise > refundable) {
    return {
      kind: "error",
      status: 409,
      code: refundable === 0 ? "NOTHING_TO_REFUND" : "AMOUNT_EXCEEDS_REFUNDABLE",
      message: refundable === 0 ? "This order has nothing left to refund." : `At most ₹${toRupees(refundable)} can still be refunded on this order.`,
      refundable: toRupees(refundable),
    };
  }
  if (refunds.length >= MAX_REFUNDS_PER_ORDER) return { kind: "error", status: 409, code: "TOO_MANY_REFUNDS", message: "This order has too many refunds already." };
  return {
    kind: "create",
    paymentId,
    entry: {
      requestId: req.requestId,
      razorpayRefundId: null,
      amount: toRupees(req.amountPaise),
      amountPaise: req.amountPaise,
      status: "REQUESTED",
      reason: req.reason,
      at: now,
      updatedAt: now,
      error: null,
      source: "admin",
    },
  };
}

// ── Writing it back ─────────────────────────────────────────────────────────────────────────────────────────────────
// The fields to update on the order: the refunds list, the payment status, updatedAt and one timeline event.
export function refundPatch(order: Row, refunds: RefundEntry[], now: number, event: string | null): Row {
  const payment = (order.payment ?? {}) as Row;
  const patch: Row = { refunds, updatedAt: now };
  if (CAPTURED_STATES.has(String(payment.status ?? ""))) patch["payment.status"] = paymentStatusAfter(order, refunds);
  if (event) patch.events = [...(Array.isArray(order.events) ? order.events : []), { at: now, actor: "GlowVai refunds", event }];
  return patch;
}

const RANK: Record<RefundStatus, number> = { REQUESTED: 0, PENDING: 1, PROCESSED: 2, FAILED: 2 };

export function statusFromRazorpay(status: unknown): RefundStatus {
  const s = String(status ?? "").toLowerCase();
  if (s === "processed") return "PROCESSED";
  if (s === "failed") return "FAILED";
  return "PENDING";
}

// Applies what Razorpay said about a refund to its entry. A final state (processed / failed) is never downgraded back
// to pending, whichever of the API answer and the webhook arrives first.
export function mergeRefund(entry: RefundEntry, update: { razorpayRefundId?: string | null; status: RefundStatus; error?: string | null }, now: number): RefundEntry {
  const keepStatus = RANK[entry.status] > RANK[update.status];
  return {
    ...entry,
    razorpayRefundId: update.razorpayRefundId ?? entry.razorpayRefundId,
    status: keepStatus ? entry.status : update.status,
    error: keepStatus ? entry.error : (update.error ?? (update.status === "FAILED" ? entry.error : null)),
    updatedAt: now,
  };
}

export function describeRefund(entry: RefundEntry): string {
  const ref = entry.razorpayRefundId ? ` (${entry.razorpayRefundId})` : "";
  if (entry.status === "PROCESSED") return `Refund of ₹${entry.amount} processed by Razorpay${ref}`;
  if (entry.status === "PENDING") return `Refund of ₹${entry.amount} accepted by Razorpay${ref}`;
  if (entry.status === "FAILED") return `Refund of ₹${entry.amount} failed${ref}${entry.error ? `: ${entry.error}` : ""}`;
  return `Refund of ₹${entry.amount} requested: ${entry.reason}`;
}

// ── Razorpay webhook: refund.processed / refund.failed ──────────────────────────────────────────────────────────────
export interface RazorpayRefundEntity {
  id?: string;
  payment_id?: string;
  amount?: number;
  status?: string;
  notes?: Record<string, unknown> | unknown[];
}

export function refundNotes(entity: RazorpayRefundEntity): { orderId: string; requestId: string } {
  const notes = (entity.notes && !Array.isArray(entity.notes) ? entity.notes : {}) as Row;
  return { orderId: typeof notes.orderId === "string" ? notes.orderId : "", requestId: typeof notes.requestId === "string" ? notes.requestId : "" };
}

// The order update for a refund webhook, or null when there is nothing to change. A refund made from the Razorpay
// dashboard (no matching entry) is added, so the order and the admin panel still show it.
export function applyRefundEvent(order: Row, eventName: string, entity: RazorpayRefundEntity, now: number): Row | null {
  if (!entity.id) return null;
  const status: RefundStatus = eventName === "refund.failed" ? "FAILED" : eventName === "refund.processed" ? "PROCESSED" : statusFromRazorpay(entity.status);
  const { requestId } = refundNotes(entity);
  const refunds = refundsOf(order);
  let index = refunds.findIndex((r) => r.razorpayRefundId === entity.id);
  if (index < 0 && requestId) index = refunds.findIndex((r) => r.requestId === requestId && !r.razorpayRefundId);
  let next: RefundEntry[];
  let entry: RefundEntry;
  if (index >= 0) {
    const before = refunds[index];
    entry = mergeRefund(before, { razorpayRefundId: entity.id, status, error: status === "FAILED" ? "Razorpay reported the refund failed." : null }, now);
    if (entry.status === before.status && entry.razorpayRefundId === before.razorpayRefundId) return null;
    next = refunds.map((r, i) => (i === index ? entry : r));
  } else {
    const paise = Math.round(Number(entity.amount) || 0);
    if (paise <= 0 || refunds.length >= MAX_REFUNDS_PER_ORDER) return null;
    entry = {
      requestId: `razorpay:${entity.id}`,
      razorpayRefundId: entity.id,
      amount: toRupees(paise),
      amountPaise: paise,
      status,
      reason: "Refunded from the Razorpay dashboard",
      at: now,
      updatedAt: now,
      error: status === "FAILED" ? "Razorpay reported the refund failed." : null,
      source: "razorpay",
    };
    next = [...refunds, entry];
  }
  return refundPatch(order, next, now, describeRefund(entry));
}

// ── Razorpay API (fetch is passed in so tests never reach Razorpay) ─────────────────────────────────────────────────
export interface RazorpayCreds {
  keyId: string;
  secret: string;
}

export interface RazorpayRefund {
  id: string;
  status: RefundStatus;
  amountPaise: number;
}

export type CreateRefundResult =
  | { ok: true; refund: RazorpayRefund }
  // definite: Razorpay answered and refused, so no refund exists. Otherwise the outcome is unknown.
  | { ok: false; definite: boolean; message: string };

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const authHeader = (creds: RazorpayCreds) => "Basic " + Buffer.from(`${creds.keyId}:${creds.secret}`).toString("base64");

export async function createRazorpayRefund(
  creds: RazorpayCreds,
  paymentId: string,
  input: { amountPaise: number; orderId: string; requestId: string; reason: string },
  fetchImpl: FetchLike = fetch,
): Promise<CreateRefundResult> {
  let res: Response;
  try {
    res = await fetchImpl(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(creds),
        // Razorpay's refund idempotency header: a repeat with the same key does not refund twice.
        "X-Refund-Idempotency": input.requestId,
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        speed: "normal",
        receipt: input.requestId.slice(0, 40),
        notes: { orderId: input.orderId, requestId: input.requestId, reason: input.reason.slice(0, 250) },
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, definite: false, message: "Razorpay could not be reached." };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string; status?: string; amount?: number; error?: { description?: string } };
  if (res.ok && data.id) return { ok: true, refund: { id: data.id, status: statusFromRazorpay(data.status), amountPaise: Number(data.amount) || input.amountPaise } };
  const message = (data.error?.description || `Razorpay refused the refund (HTTP ${res.status}).`).slice(0, 300);
  // 4xx (bad request, already refunded, insufficient balance…) means no refund was made. 5xx or no id: unknown.
  return { ok: false, definite: res.status >= 400 && res.status < 500, message };
}

// Finds a refund made earlier for this request (by notes.requestId). undefined when Razorpay could not be asked.
export async function findRazorpayRefund(creds: RazorpayCreds, paymentId: string, requestId: string, fetchImpl: FetchLike = fetch): Promise<RazorpayRefund | null | undefined> {
  try {
    const res = await fetchImpl(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refunds?count=100`, {
      method: "GET",
      headers: { Authorization: authHeader(creds) },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const data = (await res.json().catch(() => null)) as { items?: (RazorpayRefundEntity & { id?: string })[] } | null;
    if (!data || !Array.isArray(data.items)) return undefined;
    const found = data.items.find((r) => refundNotes(r).requestId === requestId && r.id);
    return found ? { id: String(found.id), status: statusFromRazorpay(found.status), amountPaise: Number(found.amount) || 0 } : null;
  } catch {
    return undefined;
  }
}
