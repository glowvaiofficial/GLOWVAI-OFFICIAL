import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import {
  createRazorpayRefund,
  findRazorpayRefund,
  internalSecret,
  parseRefundRequest,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifyInternalRequest,
  type RazorpayCreds,
} from "@/lib/shop/refunds";
import { processRefund, type RefundProvider, type RefundStore } from "@/lib/shop/refundFlow";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;

// Refunds an online order through Razorpay. Server-to-server only: the GlowVai admin panel calls it after staff approve
// a refund. The request is signed with INTERNAL_API_SECRET (see lib/shop/refunds.ts); browsers can never call it.
// Body: { orderId, amount (rupees), reason, requestId }. Idempotent on requestId.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "internal-refund-post", 30);
  if (ipLimited) return ipLimited;

  const secret = internalSecret();
  if (!secret) {
    return json({ ok: false, code: "NOT_CONFIGURED", error: "Refunds are not connected: INTERNAL_API_SECRET (32+ characters) is not set on the shop server." }, 503);
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, code: "TOO_LARGE", error: "Request body is too large." }, 413);
  const verified = verifyInternalRequest({
    secret,
    timestamp: req.headers.get(TIMESTAMP_HEADER),
    signature: req.headers.get(SIGNATURE_HEADER),
    rawBody: raw,
    now: Date.now(),
  });
  if (!verified.ok) {
    const error = verified.reason === "STALE" ? "Request timestamp is missing or more than 5 minutes off." : "Request signature is not valid.";
    return json({ ok: false, code: "UNAUTHORISED", error }, 401);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "BAD_REQUEST", error: "Body must be JSON." }, 400);
  }
  const parsed = parseRefundRequest(body);
  if (!parsed.ok) return json({ ok: false, code: "BAD_REQUEST", error: parsed.error }, 400);

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return json({ ok: false, code: "RAZORPAY_NOT_CONFIGURED", error: "Razorpay keys are not set on the shop server." }, 503);
  const creds: RazorpayCreds = { keyId, secret: keySecret };

  const store = db();
  const orders: RefundStore = {
    update: (orderId, fn) =>
      store.runTransaction(async (tx) => {
        const ref = store.collection("orders").doc(orderId);
        const snap = await tx.get(ref);
        const { result, patch } = fn(snap.exists ? (snap.data() as Record<string, unknown>) : null);
        if (patch && snap.exists) tx.update(ref, patch);
        return result;
      }),
  };
  const provider: RefundProvider = {
    create: (paymentId, input) => createRazorpayRefund(creds, paymentId, input),
    find: (paymentId, requestId) => findRazorpayRefund(creds, paymentId, requestId),
  };

  try {
    const { status, body: out } = await processRefund(parsed.value, { store: orders, provider });
    return json(out, status);
  } catch {
    // No details: errors here could carry request data. The admin panel shows this as "not confirmed".
    return json({ ok: false, code: "INTERNAL_ERROR", error: "The refund could not be saved. Retry with the same requestId." }, 500);
  }
}
