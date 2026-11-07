import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { customerFrom, db, json, limitByIp, limitByUser, tooMany } from "@/lib/shop/server";
import { ORDER_ID_RE } from "@/lib/rider/assignments";
import { buildShareUrl, issueShareToken } from "@/lib/shop/trackingShare";

export const dynamic = "force-dynamic";

// The customer's shareable tracking link for one of their orders. POST issues a new link (or regenerates it, which stops
// the old one at once). DELETE revokes it. Only a salted hash of the token is stored on the order, with its expiry.
// The token is returned once, in the URL, and is never read back by any route.

type Gate = { uid: string; orderId: string } | Response;

async function gate(req: NextRequest, context: { params: Promise<{ id: string }> }, route: string, max: number): Promise<Gate> {
  const ipLimited = limitByIp(req, route, 20);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, route, max);
  if (userLimited) return userLimited;
  const { id } = await context.params;
  if (!ORDER_ID_RE.test(id)) return json({ ok: false, error: "We could not find that order." }, 404);
  return { uid: customer.uid, orderId: id };
}

// Ownership: the order must exist and belong to the signed-in customer. Anything else is the same "not found".
async function ownedOrderRef(uid: string, orderId: string) {
  const ref = db().collection("orders").doc(orderId);
  const snap = await ref.get();
  if (!snap.exists || (snap.data() as Record<string, unknown>).userId !== uid) return null;
  return ref;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const g = await gate(req, context, "order-share-post", 10);
  if (g instanceof Response) return g;
  if (tooMany(`order-share:${g.orderId}`, 10, 60 * 60 * 1000)) {
    return json({ ok: false, error: "You have created several links for this order. Try again later." }, 429);
  }
  const ref = await ownedOrderRef(g.uid, g.orderId);
  if (!ref) return json({ ok: false, error: "We could not find that order." }, 404);
  const now = Date.now();
  const { token, record } = issueShareToken(now);
  await ref.update({ trackingShare: record });
  return json({ ok: true, url: buildShareUrl(g.orderId, token), expiresAt: new Date(record.expiresAtMs).toISOString() });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const g = await gate(req, context, "order-share-delete", 20);
  if (g instanceof Response) return g;
  const ref = await ownedOrderRef(g.uid, g.orderId);
  if (!ref) return json({ ok: false, error: "We could not find that order." }, 404);
  await ref.update({ trackingShare: FieldValue.delete() });
  return json({ ok: true });
}
