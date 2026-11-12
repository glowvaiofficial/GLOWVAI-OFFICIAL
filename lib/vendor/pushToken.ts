// Pure rules for POST /api/vendor/push-token: the body check and the device cap. The token type handling is the same
// as the customer API (lib/shop/notifications/policy.ts), so EXPO and FCM tokens are checked the same way. No server imports.
import { isTokenOfType, parseTokenType, planTokenSave, tokenHash, type PushTokenType } from "../shop/notifications/policy";

// A vendor may be signed in on up to this many devices. The oldest refreshed device is dropped when a new one registers.
export const VENDOR_MAX_DEVICES = 3;
export const VENDOR_PLATFORMS = ["ios", "android", "web"] as const;
export type VendorPlatform = (typeof VENDOR_PLATFORMS)[number];

export interface VendorPushTokenInput {
  token: string;
  platform: VendorPlatform;
  tokenType: PushTokenType;
}

export function parseVendorPushToken(body: unknown): { ok: true; value: VendorPushTokenInput } | { ok: false; error: string; field: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  // A missing tokenType is refused here (unlike the customer API, which defaults to FCM): the vendor app always sends it.
  const tokenType = b.tokenType === undefined ? null : parseTokenType(b.tokenType);
  if (!tokenType) return { ok: false, error: "tokenType must be EXPO or FCM.", field: "tokenType" };
  if (!isTokenOfType(tokenType, b.token)) return { ok: false, error: "The device token is not valid.", field: "token" };
  if (typeof b.platform !== "string" || !(VENDOR_PLATFORMS as readonly string[]).includes(b.platform)) {
    return { ok: false, error: "platform must be ios, android or web.", field: "platform" };
  }
  return { ok: true, value: { token: b.token, platform: b.platform as VendorPlatform, tokenType } };
}

// Document id for a device: the SHA-256 of its token. The token is stored in the document (needed to send), never as the id.
export const vendorPushTokenId = (token: string): string => tokenHash(token);

// Which devices to delete so that saving this one keeps the vendor at or under VENDOR_MAX_DEVICES, and how many devices
// remain afterwards. existing lists the stored devices (id and last refresh time).
export function planVendorDevices(existing: { id: string; updatedAt: number }[], token: string): { evict: string[]; devices: number } {
  const id = vendorPushTokenId(token);
  const plan = planTokenSave(existing, id, VENDOR_MAX_DEVICES);
  const kept = existing.length - plan.evict.length + (plan.alreadyRegistered ? 0 : 1);
  return { evict: plan.evict, devices: kept };
}
