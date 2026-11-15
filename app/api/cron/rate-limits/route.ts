import { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { db, json } from "@/lib/shop/server";
import { RATE_LIMIT_COLLECTION } from "@/lib/shop/rateLimit";
import { bearerToken, sameSecret } from "@/lib/shop/growth/secrets";
import { sweepUnpaidOrders } from "@/lib/shop/pendingOrders";

export const dynamic = "force-dynamic";

// Daily cleanup (vercel.json) for the shared rate-limit counters. The Firestore TTL policy is not available on the free
// plan, so this route deletes the expired documents instead. It handles both the Timestamp expiresAt (current code) and
// the older numeric expiresAt (written before the Timestamp change). It deletes at most ROUNDS x PAGE documents per run,
// so one run stays small; the next run continues. Only Vercel Cron, with the CRON_SECRET bearer token, may run it.
// The response carries counts only: no keys, IPs or uids.
// The same daily run is the backstop for unpaid online orders: PAYMENT_PENDING orders past their payment window are
// closed (stock and coins back) and expired Idempotency-Key records are deleted. Orders are also expired lazily when
// the customer reads them or places a new order, so this run only catches the ones nobody looked at. It also retries
// automatic refunds of late payments on closed orders that were started but never recorded.
const PAGE = 300;
const ROUNDS = 10;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return json({ ok: false, error: "The cleanup is not configured." }, 503);
  if (!sameSecret(bearerToken(req.headers.get("authorization")), secret)) return json({ ok: false, error: "Not authorised." }, 401);

  const store = db();
  const col = store.collection(RATE_LIMIT_COLLECTION);
  const now = Date.now();
  let deleted = 0;
  let truncated = false;

  // Current documents: expiresAt is a Timestamp.
  for (let round = 0; round < ROUNDS; round++) {
    const snap = await col.where("expiresAt", "<", Timestamp.fromMillis(now)).limit(PAGE).get();
    if (snap.empty) break;
    const batch = store.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < PAGE) break;
    if (round === ROUNDS - 1) truncated = true;
  }

  // Legacy documents: expiresAt is a number (epoch milliseconds).
  for (let round = 0; round < ROUNDS; round++) {
    const snap = await col.where("expiresAt", "<", now).limit(PAGE).get();
    if (snap.empty) break;
    const batch = store.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < PAGE) break;
    if (round === ROUNDS - 1) truncated = true;
  }

  let unpaid: { expired: number; keysDeleted: number; lateRefundsRetried: number } | { error: true } = { error: true };
  try {
    unpaid = await sweepUnpaidOrders(store, now);
  } catch (err) {
    console.error("[cron] unpaid order sweep failed", err instanceof Error ? err.message : err);
  }

  return json({ ok: true, deleted, truncated, unpaid });
}
