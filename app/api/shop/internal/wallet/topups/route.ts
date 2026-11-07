import { NextRequest } from "next/server";
import { json, limitByIp, text } from "@/lib/shop/server";
import { internalSecret, SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyInternalRequest } from "@/lib/shop/refunds";
import { listTopupsLive } from "@/lib/shop/wallet/live";
import type { TopupStatus } from "@/lib/shop/wallet/rules";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;
const STATUSES: readonly TopupStatus[] = ["CREATED", "PAID", "FAILED", "EXPIRED"];

// Read model for the GlowVai team: top-ups with masked customers, reconciliation totals (paid top-ups against ledger
// credits) and the differences. Signed with INTERNAL_API_SECRET, like the other internal routes. Read-only.
// Body (all optional): { status, uid, from, to, limit }. from and to are epoch milliseconds.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "internal-wallet-topups", 60);
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
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return json({ ok: false, code: "BAD_REQUEST", error: "Body must be JSON." }, 400);
  }
  const status = typeof body.status === "string" && (STATUSES as readonly string[]).includes(body.status) ? (body.status as TopupStatus) : undefined;
  const uid = body.uid === undefined ? undefined : text(body.uid, 128);
  if (uid !== undefined && !/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return json({ ok: false, code: "BAD_REQUEST", error: "Send a valid customer id." }, 400);
  const from = typeof body.from === "number" && Number.isFinite(body.from) ? body.from : undefined;
  const to = typeof body.to === "number" && Number.isFinite(body.to) ? body.to : undefined;
  const limit = typeof body.limit === "number" && Number.isInteger(body.limit) ? body.limit : undefined;
  const result = await listTopupsLive({ status, uid, from, to, limit });
  return json({ ok: true, ...result });
}
