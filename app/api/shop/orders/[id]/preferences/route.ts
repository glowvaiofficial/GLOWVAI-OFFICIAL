import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { ORDER_ID_PATTERN, type Doc } from "@/lib/shop/orderState";
import { parseSubstitutionPreference, preferenceChangeBlock } from "@/lib/shop/preferences";

export const dynamic = "force-dynamic";

// Sets what the customer wants if an item cannot be supplied. Allowed only while the order is not packed (the status and
// the admin's fulfilment are read in the same transaction as the write). Writes two fields on the existing order and
// nothing else (not updatedAt, which the store and admin use for ordering). This route does not touch order placement.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "order-preferences", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  // Thirty changes an hour per customer.
  const userLimited = limitByUser(customer.uid, "order-preferences", 30, 60 * 60 * 1000);
  if (userLimited) return userLimited;

  const { id } = await params;
  if (!ORDER_ID_PATTERN.test(id)) return json({ ok: false, error: "Order not found." }, 404);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const preference = parseSubstitutionPreference(body?.substitutionPreference);
  if (!preference) return json({ ok: false, error: "Choose what should happen if an item is unavailable." }, 400);

  const store = db();
  const ref = store.collection("orders").doc(id);
  const overlayRef = store.collection("admin_orders").doc(id);
  const result = await store.runTransaction(async (tx) => {
    const [snap, overlaySnap] = await tx.getAll(ref, overlayRef);
    const order = snap.data() as Doc | undefined;
    if (!snap.exists || !order || order.userId !== customer.uid) return { status: 404 as const, error: "Order not found." };
    const overlay = overlaySnap.exists ? (overlaySnap.data() as Doc) : null;
    const block = preferenceChangeBlock(order, overlay);
    if (!block.ok) return { status: block.status, error: block.error };
    if (order.substitutionPreference === preference) return { status: 200 as const, error: null, unchanged: true };
    tx.update(ref, { substitutionPreference: preference, substitutionPreferenceAt: Date.now() });
    return { status: 200 as const, error: null, unchanged: false };
  });
  if (result.error) return json({ ok: false, error: result.error }, result.status);
  return json({ ok: true, substitutionPreference: preference, unchanged: result.unchanged });
}
