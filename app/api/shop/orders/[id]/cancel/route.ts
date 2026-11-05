import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser, text } from "@/lib/shop/server";

export const dynamic = "force-dynamic";

// A customer can cancel their own order only before anyone has started on it (status PLACED, not changed by the admin).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "cancel-post", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "cancel", 60);
  if (userLimited) return userLimited;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = text(body.reason, 200) || "Cancelled by the customer";

  const store = db();
  const ref = store.collection("orders").doc(id);
  const overlayRef = store.collection("admin_orders").doc(id);
  try {
    await store.runTransaction(async (tx) => {
      const [snap, overlay] = await Promise.all([tx.get(ref), tx.get(overlayRef)]);
      const o = snap.data();
      if (!snap.exists || !o || o.userId !== customer.uid) throw new Error("NOT_FOUND");
      const adminFulfilment = String(overlay.data()?.fulfilment ?? "");
      if (o.status !== "PLACED" || (adminFulfilment && adminFulfilment !== "CREATED")) throw new Error("TOO_LATE");
      const now = Date.now();
      tx.update(ref, {
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledBy: "customer",
        updatedAt: now,
        events: [...(Array.isArray(o.events) ? o.events : []), { at: now, actor: "Customer", event: `Order cancelled: ${reason}` }],
      });
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "NOT_FOUND") return json({ ok: false, error: "Order not found." }, 404);
    if (code === "TOO_LATE") return json({ ok: false, error: "This order is already being prepared. Contact support to cancel it." }, 409);
    throw err;
  }
  return json({ ok: true });
}
