import { db } from "@/lib/shop/server";
import { VendorError } from "@/lib/vendor/errors";
import { perMinute, preflight, vendorRoute } from "@/lib/vendor/http";
import { isMine, isStaffCancelled, missingStock, neededStock, offerBlock, toVendorOrder } from "@/lib/vendor/orders";
import { inventoryCol, loadVendor, operatorOf } from "@/lib/vendor/store";
import { ORDER_ID_RE } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

// Accepts an offered order in one transaction: the order, the staff overlay and my stock for every item are read and
// checked together; then my stock is reserved (decremented) and the order is assigned to me. The first store to
// accept wins; the others get ORDER_ALREADY_ASSIGNED. Accepting an order that is already mine returns it unchanged.
export const POST = vendorRoute<{ orderId: string }>({ route: "accept", ip: perMinute(30), user: perMinute(20) }, async ({ me, params }) => {
  const orderId = String(params.orderId ?? "");
  if (!ORDER_ID_RE.test(orderId)) throw new VendorError("NOT_FOUND", 404, "We could not find that order.");

  const vendor = operatorOf(await loadVendor(me.uid));
  if (!vendor.canOperate) throw new VendorError("NOT_APPROVED", 403);

  const store = db();
  const orderRef = store.collection("orders").doc(orderId);
  const ovRef = store.collection("admin_orders").doc(orderId);

  const accepted = await store.runTransaction(async (tx) => {
    const [orderSnap, ovSnap] = await tx.getAll(orderRef, ovRef);
    const order = orderSnap.exists ? (orderSnap.data() as Doc) : null;
    if (!order) throw new VendorError("NOT_FOUND", 404, "We could not find that order.");
    const overlay = ovSnap.exists ? (ovSnap.data() as Doc) : null;
    if (isMine(order, me.uid)) return { order, overlay };
    if (order.status === "CANCELLED" || isStaffCancelled(overlay)) throw new VendorError("ORDER_CANCELLED", 409);

    const now = Date.now();
    const block = offerBlock(order, vendor, now, { ignoreFreshness: true });
    if (block === "ASSIGNED") throw new VendorError("ORDER_ALREADY_ASSIGNED", 409);
    if (block === "OFFLINE") throw new VendorError("NOT_ELIGIBLE", 403, "Go online to accept orders.");
    if (block) throw new VendorError("NOT_ELIGIBLE", 403);

    const need = neededStock(order);
    if (need.size === 0) throw new VendorError("NOT_ELIGIBLE", 403);
    const invRefs = [...need.keys()].map((id) => inventoryCol(me.uid).doc(id));
    const invSnaps = await tx.getAll(...invRefs);
    const lines = invSnaps.map((s) => {
      const d = (s.data() ?? {}) as Doc;
      return { productId: s.id, exists: s.exists, stock: Number(d.stock) || 0, isAvailable: d.isAvailable === true };
    });
    const missing = missingStock(order, lines);
    if (missing.length) throw new VendorError("OUT_OF_STOCK", 409, undefined, { missing });

    for (const line of lines) {
      tx.update(inventoryCol(me.uid).doc(line.productId), { stock: line.stock - (need.get(line.productId)?.quantity ?? 0), updatedAt: now });
    }
    const patch: Doc = {
      vendorId: vendor.applicationId,
      vendorUid: me.uid,
      vendorName: vendor.storeName,
      vendorStatus: "ACCEPTED",
      status: "VENDOR_ACCEPTED",
      vendorAcceptedAt: now,
      stockReservation: { vendorUid: me.uid, items: [...need].map(([productId, { quantity }]) => ({ productId, quantity })) },
      updatedAt: now,
      events: [...(Array.isArray(order.events) ? order.events : []), { at: now, actor: `Vendor ${vendor.storeName}`, event: "Order accepted by the store" }],
    };
    tx.update(orderRef, patch);
    return { order: { ...order, ...patch }, overlay };
  });

  return { order: toVendorOrder(accepted.order, { uid: me.uid, isOffer: false, overlay: accepted.overlay, orderId }) };
});

export const OPTIONS = preflight;
