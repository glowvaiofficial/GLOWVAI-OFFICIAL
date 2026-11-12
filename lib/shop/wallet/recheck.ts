// Pure rules for POST /api/shop/internal/wallet/recheck: the body check, the feature gate and the HTTP status for each
// outcome. The re-check itself is recheckHeldTopup in verify.ts. No server imports.

// Top-ups stay off until the owner sets WALLET_TOPUP_ENABLED=true (same gate as the customer top-up route).
export const topupsEnabled = (env: Record<string, string | undefined> = process.env): boolean => env.WALLET_TOPUP_ENABLED === "true";

export const RECHECK_MAX_BODY = 1024;

export type RecheckRequest = { captureId: string } | { topupId: string };

// Exactly one of captureId (a Razorpay payment id, pay_...) or topupId (the 24-hex top-up id) must be sent.
export function parseRecheckBody(body: unknown): { ok: true; value: RecheckRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const hasCapture = b.captureId !== undefined;
  const hasTopup = b.topupId !== undefined;
  if (hasCapture === hasTopup) return { ok: false, error: "Send exactly one of captureId or topupId." };
  if (hasCapture) {
    if (typeof b.captureId !== "string" || !/^pay_[A-Za-z0-9]{6,64}$/.test(b.captureId)) return { ok: false, error: "captureId must be a Razorpay payment id (pay_...)." };
    return { ok: true, value: { captureId: b.captureId } };
  }
  if (typeof b.topupId !== "string" || !/^[a-f0-9]{24}$/.test(b.topupId)) return { ok: false, error: "topupId is not valid." };
  return { ok: true, value: { topupId: b.topupId } };
}

export type RecheckOutcome =
  | { outcome: "CREDITED"; topupId: string; coins: number; balance: number; alreadyCredited: boolean }
  | { outcome: "STILL_HELD"; topupId: string; reason: "AMOUNT_MISMATCH" | "BALANCE_CAP" | "PAYMENT_UNCONFIRMED" | "PAYMENT_PENDING" }
  | { outcome: "REFUSED"; topupId: string | null; code: string; error: string };

// 200 when the coins are credited or the hold stands (the answer is known); 404 or 409 when the re-check is refused.
export function statusFor(result: RecheckOutcome): number {
  if (result.outcome !== "REFUSED") return 200;
  return result.code === "NOT_FOUND" ? 404 : 409;
}
