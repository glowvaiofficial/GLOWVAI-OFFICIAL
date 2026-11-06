import { NextRequest } from "next/server";
import { db, json, limitByIp, text } from "@/lib/shop/server";
import { internalSecret, SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyInternalRequest } from "@/lib/shop/refunds";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { adjustCoins } from "@/lib/shop/growth/coins";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2048;

// Manual coin adjustment by the GlowVai team: a signed whole number of coins with a reason (at least 5 characters).
// Written to the customer's ledger as an ADMIN_ADJUSTMENT entry. Signed with INTERNAL_API_SECRET; idempotent on
// idempotencyKey, so a repeated request is applied once. A debit that would take the balance below zero is refused.
// Body: { uid, amount, reason, actor, idempotencyKey }.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "internal-coins-adjust", 60);
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
  const uid = text(body.uid, 128);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return json({ ok: false, code: "BAD_REQUEST", error: "Send a valid customer id." }, 400);
  const amount = typeof body.amount === "number" ? body.amount : NaN;
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100_000) {
    return json({ ok: false, code: "BAD_REQUEST", error: "Send a whole number of coins, positive or negative." }, 400);
  }
  const reason = text(body.reason, 200);
  if (reason.length < 5) return json({ ok: false, code: "BAD_REQUEST", error: "Give a reason of at least 5 characters." }, 400);
  const idempotencyKey = text(body.idempotencyKey, 120);
  if (!idempotencyKey) return json({ ok: false, code: "BAD_REQUEST", error: "Send an idempotency key." }, 400);

  const result = await adjustCoins(firestoreRepo(db()), {
    uid,
    amount,
    reason,
    actor: text(body.actor, 80),
    idempotencyKey,
    now: Date.now(),
  });
  if (!result.ok) return json({ ok: false, code: result.code, error: "The coins could not be adjusted." }, 409);
  return json({ ok: true, applied: result.applied, balance: result.balance });
}
