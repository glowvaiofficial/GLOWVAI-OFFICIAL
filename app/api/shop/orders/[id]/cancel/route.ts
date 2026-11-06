import { NextRequest } from "next/server";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { customerFrom, db, json, limitByIp, limitByUser, text } from "@/lib/shop/server";
import { planRelease, platformLinesOf } from "@/lib/shop/platformStock";
import { readProductStock, writeStockChanges } from "@/lib/shop/platformStockTx";
import { notifyCustomer } from "@/lib/shop/notify";

export const dynamic = "force-dynamic";

// A customer can cancel their own order until it is packed: while it waits for a store (PLACED) or after a store
// accepted it (VENDOR_ACCEPTED), and only when the admin has not started on it. Stock a store reserved on accept is
// given back to that store in the same transaction.
const CANCELLABLE = new Set(["PLACED", "VENDOR_ACCEPTED"]);
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
      if (!CANCELLABLE.has(String(o.status)) || (adminFulfilment && adminFulfilment !== "CREATED")) throw new Error("TOO_LATE");

      // Reserved stock goes back to the store. All reads happen before any write (Firestore transaction rule).
      const reservation = (o.stockReservation ?? null) as { vendorUid?: unknown; items?: unknown; releasedAt?: unknown } | null;
      const releases: { ref: DocumentReference; quantity: number }[] = [];
      if (reservation && typeof reservation.vendorUid === "string" && reservation.vendorUid && !reservation.releasedAt && Array.isArray(reservation.items)) {
        const inventory = store.collection("vendors").doc(reservation.vendorUid).collection("vendorInventory");
        const lines = (reservation.items as { productId?: unknown; quantity?: unknown }[])
          .map((it) => ({ productId: String(it?.productId ?? ""), quantity: Math.floor(Number(it?.quantity) || 0) }))
          .filter((it) => /^[A-Za-z0-9_-]{1,140}$/.test(it.productId) && it.quantity > 0);
        if (lines.length) {
          const snaps = await tx.getAll(...lines.map((it) => inventory.doc(it.productId)));
          // A line the store has since deleted is not re-created.
          snaps.forEach((s, i) => s.exists && releases.push({ ref: s.ref, quantity: lines[i].quantity }));
        }
      }

      // Platform stock reserved at checkout goes back once (planRelease is empty after the first release).
      const platformStock = await readProductStock(tx, store, platformLinesOf(reservation).map((l) => l.productId));
      const platformChanges = planRelease(reservation, platformStock);

      const now = Date.now();
      for (const r of releases) tx.update(r.ref, { stock: FieldValue.increment(r.quantity), updatedAt: now });
      writeStockChanges(tx, store, platformChanges, now);
      tx.update(ref, {
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledBy: "customer",
        updatedAt: now,
        ...(reservation ? { "stockReservation.releasedAt": now } : {}),
        events: [...(Array.isArray(o.events) ? o.events : []), { at: now, actor: "Customer", event: `Order cancelled: ${reason}` }],
      });
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "NOT_FOUND") return json({ ok: false, error: "Order not found." }, 404);
    if (code === "TOO_LATE") return json({ ok: false, error: "This order is already packed or on its way. Contact support to cancel it." }, 409);
    throw err;
  }
  // Customer notification. notifyCustomer never throws, so the cancellation stands even if it fails.
  await notifyCustomer(customer.uid, { type: "order_cancelled", relatedId: id });
  return json({ ok: true });
}
