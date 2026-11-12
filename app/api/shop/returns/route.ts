import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { DAY_MS, ORDER_ID_PATTERN, type Doc } from "@/lib/shop/orderState";
import { recordActivity } from "@/lib/shop/activity";
import {
  RETURN_COLLECTION,
  RETURN_LOCK_COLLECTION,
  customerReturnView,
  evaluateReturn,
  isRequestId,
  itemLockId,
  parseReturnRequest,
  returnIdFor,
  type EligibilityFailure,
} from "@/lib/shop/returns";

export const dynamic = "force-dynamic";

// Returns and replacements a customer asks for on a delivered order. Creation is idempotent (requestId), each order item
// can be requested once (a lock document per item, written in the same transaction), and the order is read in that
// transaction so a late cancellation cannot slip through. Staff decide and move the state (lib/shop/returns.ts).
class RequestBlocked extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "returns-get", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "returns-get", 60);
  if (userLimited) return userLimited;

  const orderId = new URL(req.url).searchParams.get("orderId") ?? "";
  if (orderId && !ORDER_ID_PATTERN.test(orderId)) return json({ ok: false, error: "Order not found." }, 404);
  let query = db().collection(RETURN_COLLECTION).where("uid", "==", customer.uid);
  if (orderId) query = query.where("orderId", "==", orderId);
  const snap = await query.limit(50).get();
  const returns = snap.docs
    .map((d) => customerReturnView(d.data() as Doc, d.id))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return json({ ok: true, returns });
}

export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "returns-post", 20);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  // Five requests a day per customer, counted per attempt.
  const dailyLimited = limitByUser(customer.uid, "returns-post", 5, DAY_MS);
  if (dailyLimited) return dailyLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!ORDER_ID_PATTERN.test(orderId)) return json({ ok: false, error: "Order not found." }, 404);
  if (!isRequestId(body.requestId)) return json({ ok: false, error: "Something went wrong with this request. Refresh and try again." }, 400);
  const requestId = body.requestId;
  const parsed = parseReturnRequest(body);
  if (!parsed.ok) return json({ ok: false, error: parsed.error, field: parsed.field }, 400);
  const request = parsed.value;

  const store = db();
  const orderRef = store.collection("orders").doc(orderId);
  const overlayRef = store.collection("admin_orders").doc(orderId);
  const returnId = returnIdFor(customer.uid, requestId);
  const returnRef = store.collection(RETURN_COLLECTION).doc(returnId);
  const lockRefs = request.items.map((it) => store.collection(RETURN_LOCK_COLLECTION).doc(itemLockId(orderId, it.productId)));

  try {
    const result = await store.runTransaction(async (tx) => {
      const [orderSnap, overlaySnap, existingSnap, ...lockSnaps] = await tx.getAll(orderRef, overlayRef, returnRef, ...lockRefs);
      // A retry of a request that already went through returns that request, unchanged.
      if (existingSnap.exists) return { doc: existingSnap.data() as Doc, created: false };

      const order = orderSnap.data() as Doc | undefined;
      if (!orderSnap.exists || !order || order.userId !== customer.uid) throw new RequestBlocked(404, "Order not found.");
      const overlay = overlaySnap.exists ? (overlaySnap.data() as Doc) : null;
      const alreadyRequested = new Set(request.items.filter((_, i) => lockSnaps[i]?.exists).map((it) => it.productId));
      const verdict = evaluateReturn({ order, overlay, now: Date.now(), request, alreadyRequested });
      if (!verdict.ok) throw new RequestBlocked((verdict as EligibilityFailure).status, verdict.error);

      const now = Date.now();
      const doc = {
        returnId,
        requestId,
        orderId,
        uid: customer.uid,
        type: request.type,
        reason: request.reason,
        note: request.note,
        items: verdict.lines,
        status: "REQUESTED",
        deliveredAt: verdict.deliveredAt,
        createdAt: now,
        updatedAt: now,
        events: [{ at: now, actor: "Customer", status: "REQUESTED", note: "" }],
      };
      tx.create(returnRef, doc);
      for (const ref of lockRefs) tx.create(ref, { returnId, orderId, uid: customer.uid, createdAt: now });
      return { doc, created: true };
    });
    if (result.created) await recordActivity(customer.uid, "return_requested", Date.now());
  return json({ ok: true, created: result.created, return: customerReturnView(result.doc, returnId) }, result.created ? 201 : 200);
  } catch (err) {
    if (err instanceof RequestBlocked) return json({ ok: false, error: err.message }, err.status);
    throw err;
  }
}
