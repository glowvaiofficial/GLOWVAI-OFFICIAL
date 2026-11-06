import { NextRequest } from "next/server";
import { db, json, limitByIp, text } from "@/lib/shop/server";
import { internalSecret, SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyInternalRequest } from "@/lib/shop/refunds";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { grantReferralRewards } from "@/lib/shop/growth/referrals";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2048;

// Grants the referral rewards for an order that has been delivered. Called by the GlowVai admin panel's delivered
// action, server to server, signed with INTERNAL_API_SECRET (same signing as the refund route). Idempotent per order
// and per referee: a repeat call returns granted false and changes nothing.
// Body: { orderId, actor }. The actor is a short label for the audit trail (for example the staff member's name).
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "internal-referral-rewards", 60);
  if (ipLimited) return ipLimited;
  const secret = internalSecret();
  if (!secret) return json({ ok: false, code: "NOT_CONFIGURED", error: "INTERNAL_API_SECRET is not set on the shop server." }, 503);
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, code: "TOO_LARGE", error: "Request body is too large." }, 413);
  const verified = verifyInternalRequest({
    secret,
    timestamp: req.headers.get(TIMESTAMP_HEADER),
    signature: req.headers.get(SIGNATURE_HEADER),
    rawBody: raw,
    now: Date.now(),
  });
  if (!verified.ok) return json({ ok: false, code: "UNAUTHORISED", error: "Request signature is not valid." }, 401);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "BAD_REQUEST", error: "Body must be JSON." }, 400);
  }
  const orderId = text(body.orderId, 80);
  if (!/^GV-[A-Z0-9-]{6,60}$/.test(orderId)) return json({ ok: false, code: "BAD_REQUEST", error: "Send a valid order id." }, 400);
  const actor = text(body.actor, 80);
  const result = await grantReferralRewards(firestoreRepo(db()), { orderId, actor, now: Date.now() });
  if (!result.ok) return json({ ok: false, code: result.code, error: "The referral reward could not be granted." }, 409);
  return json(result);
}
