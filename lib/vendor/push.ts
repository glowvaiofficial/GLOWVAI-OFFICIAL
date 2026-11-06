// Vendor push: token rules and the offer notification core. Pure: the Firestore and FCM calls are passed in as
// dependencies, so the never-throws rule can be tested. The wired version lives in ./notify.ts (server only).
//
// Tokens are FCM device tokens, stored at vendors/{uid}/pushTokens/{sha256(token)} and never shown back to anyone.
import { createHash } from "node:crypto";
import { invalid } from "./errors";
import type { Result } from "./validation";

export const PUSH_TOKEN_MAX = 3;
export const PUSH_PLATFORMS = ["android", "ios", "web"] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

/** Document id of a token: its SHA-256 hex. The raw token is kept in the document only so it can be sent to. */
export const tokenIdOf = (token: string): string => createHash("sha256").update(token).digest("hex");

export function parsePushToken(body: unknown): Result<{ token: string; platform: PushPlatform }> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const token = typeof b.token === "string" ? b.token.trim() : "";
  if (token.length < 20 || token.length > 4096 || /\s/.test(token)) return { ok: false, error: "That device token is not valid.", field: "token" };
  const platform = typeof b.platform === "string" ? b.platform.toLowerCase() : "";
  if (!(PUSH_PLATFORMS as readonly string[]).includes(platform)) return { ok: false, error: "Say which platform the device is.", field: "platform" };
  return { ok: true, value: { token, platform: platform as PushPlatform } };
}

/**
 * Whether a token may be saved. A token already registered can always be refreshed; a new one needs a free slot.
 * `registered` is how many tokens the vendor has now.
 */
export const deviceCapAllows = (registered: number, alreadyRegistered: boolean): boolean => alreadyRegistered || registered < PUSH_TOKEN_MAX;

export const deviceCapError = () =>
  invalid(`You can use notifications on up to ${PUSH_TOKEN_MAX} devices. Remove one and try again.`, { field: "token" });

// ---- Offer notification core

export interface StoredToken {
  id: string;
  token: string;
}

export interface OfferPushDeps {
  loadTokens: (vendorUid: string) => Promise<StoredToken[]>;
  send: (tokens: string[], message: { title: string; body: string; data: Record<string, string> }) => Promise<{ successCount: number; failureCount: number; invalidIndexes: number[] }>;
  removeTokens: (vendorUid: string, ids: string[]) => Promise<void>;
  log: (message: string, code?: string) => void;
}

export const OFFER_PUSH_TITLE = "New order nearby";
export const OFFER_PUSH_BODY = "Open GlowVai Store to accept it before another store does.";

export interface OfferPushResult {
  sent: number;
  failed: number;
  removed: number;
}

/**
 * Pushes "new order" to every registered device of one vendor. Never throws and never rejects: any failure is logged with
 * a short code only (no uid, token, name or address) and reported as a zero result.
 */
export async function notifyVendorOfferWith(deps: OfferPushDeps, vendorUid: string, orderId: string): Promise<OfferPushResult> {
  const none: OfferPushResult = { sent: 0, failed: 0, removed: 0 };
  try {
    if (!vendorUid || !orderId) return none;
    const tokens = (await deps.loadTokens(vendorUid)).filter((t) => t.token.length >= 20 && t.token.length <= 4096).slice(0, PUSH_TOKEN_MAX);
    if (tokens.length === 0) return none;
    const report = await deps.send(
      tokens.map((t) => t.token),
      { title: OFFER_PUSH_TITLE, body: OFFER_PUSH_BODY, data: { type: "vendor_offer", orderId } },
    );
    const dead = report.invalidIndexes.map((i) => tokens[i]?.id).filter((id): id is string => Boolean(id));
    if (dead.length) await deps.removeTokens(vendorUid, dead);
    return { sent: report.successCount, failed: report.failureCount, removed: dead.length };
  } catch (err) {
    deps.log("vendor offer push failed", (err as { code?: string })?.code ?? "UNKNOWN");
    return none;
  }
}
