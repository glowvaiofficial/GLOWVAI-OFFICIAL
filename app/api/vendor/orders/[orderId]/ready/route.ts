import { db } from "@/lib/shop/server";
import { VendorError } from "@/lib/vendor/errors";
import { decideReady } from "@/lib/vendor/fulfilment";
import { perMinute, preflight, vendorRoute } from "@/lib/vendor/http";
import { isMine, isStaffCancelled, toVendorOrder } from "@/lib/vendor/orders";
import { loadVendor, operatorOf } from "@/lib/vendor/store";
import { ORDER_ID_RE } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

// Marks my packed order ready for pickup. This only says the parcel is waiting at the store: no rider is assigned here.
export const POST = vendorRoute<{ orderId: string }>({ route: "ready", ip: perMinute(30), user: perMinute(20) }, async ({ me, params }) => {
  const orderId = String(params.orderId ?? "");
  if (!ORDER_ID_RE.test(orderId)) throw new VendorError("NOT_FOUND", 404, "We could not find that order.");

  // A paused store still finishes the orders it accepted.
  const vendor = operatorOf(await loadVendor(me.uid));
  if (!vendor.approved) throw new VendorError("NOT_APPROVED", 403);

  const store = db();
  const ref = store.collection("orders").doc(orderId);
  const ovRef = store.collection("admin_orders").doc(orderId);
  const result = await store.runTransaction(async (tx) => {
    const [snap, ovSnap] = await tx.getAll(ref, ovRef);
    const order = snap.exists ? (snap.data() as Doc) : null;
    // Another store's order is reported as not found: nothing about it is shared.
    if (!order || !isMine(order, me.uid)) throw new VendorError("NOT_FOUND", 404, "We could not find that order.");
    const overlay = ovSnap.exists ? (ovSnap.data() as Doc) : null;
    const decision = decideReady(order, isStaffCancelled(overlay));
    if (decision.kind === "refuse") {
      throw new VendorError(decision.code, 409, decision.code === "INVALID_STATE" ? "Only a packed order can be marked ready for pickup." : undefined);
    }
    if (decision.kind === "noop") return { order, overlay };

    const now = Date.now();
    const patch: Doc = {
      status: "READY_FOR_PICKUP",
      vendorStatus: "READY_FOR_PICKUP",
      vendorReadyAt: now,
      updatedAt: now,
      events: [...(Array.isArray(order.events) ? order.events : []), { at: now, actor: `Vendor ${vendor.storeName}`, event: "Order ready for pickup" }],
    };
    tx.update(ref, patch);
    return { order: { ...order, ...patch }, overlay };
  });

  return { order: toVendorOrder(result.order, { uid: me.uid, isOffer: false, overlay: result.overlay, orderId }) };
});

export const OPTIONS = preflight;
