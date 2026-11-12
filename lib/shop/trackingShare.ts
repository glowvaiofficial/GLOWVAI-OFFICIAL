// Shareable tracking links: https://glowvai.in/shop?track={orderId}&k={token}. The token is 32 random bytes (base64url).
// Only a salted hash of it is stored on the order, with an expiry 48 hours after it was issued. Regenerating replaces the
// record, so the old link stops working at once; revoking removes it. The public view is an allow-list projection: it
// carries no customer name, phone, address, items, delivery code or internal ids. Uses node:crypto only.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { customerStatus, deliveredAtOf, isCancelled, toMillis, type Doc } from "./orderState";
import { STATUS_TEXT, statusText } from "./tracking";
import { firstNameFor } from "./reviewRules";

export const SHARE_BASE_URL = "https://glowvai.in";
export const SHARE_TTL_MS = 48 * 60 * 60 * 1000;
export const SHARE_TOKEN_BYTES = 32;
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const STORE_NAME = "GlowVai";
export const SHARE_GENERIC_ERROR = "This tracking link is no longer valid. Ask the customer for a new link.";

export interface ShareRecord {
  hash: string;
  salt: string;
  issuedAtMs: number;
  expiresAtMs: number;
}

// A new random token. Returns the token (shown to the customer once) and the record to store on the order.
export function issueShareToken(now: number, random: (n: number) => Buffer = randomBytes): { token: string; record: ShareRecord } {
  const token = random(SHARE_TOKEN_BYTES).toString("base64url");
  const salt = random(16).toString("hex");
  return { token, record: { hash: hashShareToken(token, salt), salt, issuedAtMs: now, expiresAtMs: now + SHARE_TTL_MS } };
}

// SHA-256 over the per-order salt and the token. Only this value is stored.
export function hashShareToken(token: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${token}`, "utf8").digest("hex");
}

// Reads a stored record off an order document. Anything malformed counts as no share at all.
export function shareRecordOf(raw: unknown): ShareRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.hash !== "string" || !/^[a-f0-9]{64}$/.test(r.hash)) return null;
  if (typeof r.salt !== "string" || !/^[a-f0-9]{32}$/.test(r.salt)) return null;
  if (typeof r.issuedAtMs !== "number" || typeof r.expiresAtMs !== "number") return null;
  return { hash: r.hash, salt: r.salt, issuedAtMs: r.issuedAtMs, expiresAtMs: r.expiresAtMs };
}

export type ShareCheck = { ok: true } | { ok: false; reason: "missing" | "malformed" | "expired" | "mismatch" };

// Whether a presented token opens a stored share right now. Revoking removes the record, so "missing" covers revoked
// links too. The hash comparison is constant-time. Callers answer every failure with the same generic message.
export function checkShareToken(token: unknown, record: ShareRecord | null, now: number): ShareCheck {
  if (!record) return { ok: false, reason: "missing" };
  if (typeof token !== "string" || !SHARE_TOKEN_PATTERN.test(token)) return { ok: false, reason: "malformed" };
  if (now >= record.expiresAtMs) return { ok: false, reason: "expired" };
  const presented = Buffer.from(hashShareToken(token, record.salt), "hex");
  const stored = Buffer.from(record.hash, "hex");
  if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) return { ok: false, reason: "mismatch" };
  return { ok: true };
}

// The shareable link for an order and token.
export function buildShareUrl(orderId: string, token: string): string {
  return `${SHARE_BASE_URL}/shop?track=${encodeURIComponent(orderId)}&k=${encodeURIComponent(token)}`;
}

// --- Public view ---------------------------------------------------------------------------------------------------------

export interface PublicTrackingView {
  orderId: string;
  storeName: string;
  status: string;
  statusText: string;
  cancelled: boolean;
  delivered: boolean;
  outForDelivery: boolean;
  expectedWindow: { from: number; to: number } | null;
  delayed: boolean;
  delayText: string | null;
  // The rider's first name, only while the order is out for delivery. Never a phone number or a surname.
  riderFirstName: string | null;
  liveLocation: false;
}

// The window the customer was given, from the slot picked at checkout. Nothing is estimated here.
function windowOf(order: Doc): { from: number; to: number } | null {
  const raw = (order.deliverySlot ?? order.slot) as Doc | undefined;
  if (!raw || typeof raw !== "object") return null;
  const from = toMillis(raw.from ?? raw.start);
  const to = toMillis(raw.to ?? raw.end);
  return from !== null && to !== null && from < to ? { from, to } : null;
}

// Built from an allow-list. The delivery code, addresses, items, phone numbers and staff notes are never read.
export function publicTrackingView(order: Doc, overlay: Doc | null | undefined, orderId: string, now: number): PublicTrackingView {
  const status = customerStatus(order, overlay).toUpperCase();
  const cancelled = isCancelled(order, overlay);
  const delivered = !cancelled && (status === "DELIVERED" || deliveredAtOf(order) !== null);
  const outForDelivery = !cancelled && !delivered && status === "OUT_FOR_DELIVERY";
  const expectedWindow = !cancelled && !delivered ? windowOf(order) : null;
  // Delayed only when the window given to the customer has passed and the order is still open.
  const delayed = expectedWindow !== null && now > expectedWindow.to;
  const rider = (order.rider ?? null) as Doc | null;
  const riderName = typeof rider?.name === "string" ? rider.name : typeof order.riderName === "string" ? order.riderName : "";
  return {
    orderId,
    storeName: STORE_NAME,
    status,
    statusText: cancelled ? STATUS_TEXT.CANCELLED : delivered ? STATUS_TEXT.DELIVERED : statusText(status),
    cancelled,
    delivered,
    outForDelivery,
    expectedWindow,
    delayed,
    delayText: delayed ? "Your delivery is running later than the time window we gave you. We are still on it." : null,
    riderFirstName: outForDelivery ? firstNameFor(riderName) || null : null,
    liveLocation: false,
  };
}
