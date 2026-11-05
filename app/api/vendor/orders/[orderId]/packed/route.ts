import { db } from "@/lib/shop/server";
import { VendorError, invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { isMine, isStaffCancelled, toVendorOrder, uncheckedItems } from "@/lib/vendor/orders";
import { loadVendor, operatorOf } from "@/lib/vendor/store";
import { ORDER_ID_RE, parseCheckedProductIds } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

// Marks my accepted order packed, after the vendor ticked every item. Pickup handover is a later phase.
export const POST = vendorRoute<{ orderId: string }>({ route: "packed", ip: perMinute(30), user: perMinute(20) }, async ({ req, me, params }) => {
  const orderId = String(params.orderId ?? "");
  if (!ORDER_ID_RE.test(orderId)) throw new VendorError("NOT_FOUND", 404, "We could not find that order.");
  const parsed = parseCheckedProductIds(await readJson(req));
  if (!parsed.ok) throw new VendorError("ITEMS_NOT_CHECKED", 400, parsed.error, { field: parsed.field });

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
    if (order.status === "CANCELLED" || isStaffCancelled(overlay)) throw new VendorError("ORDER_CANCELLED", 409);
    if (order.status === "PACKED") return { order, overlay };
    if (order.status !== "VENDOR_ACCEPTED") throw new VendorError("INVALID_STATE", 409, "This order cannot be marked packed now.");
    const missing = uncheckedItems(order, parsed.value);
    if (missing.length) throw new VendorError("ITEMS_NOT_CHECKED", 400, undefined, { missing });

    const now = Date.now();
    const patch: Doc = {
      status: "PACKED",
      vendorStatus: "PACKED",
      vendorPackedAt: now,
      updatedAt: now,
      events: [...(Array.isArray(order.events) ? order.events : []), { at: now, actor: `Vendor ${vendor.storeName}`, event: "Order packed, waiting for pickup" }],
    };
    tx.update(ref, patch);
    return { order: { ...order, ...patch }, overlay };
  });

  return { order: toVendorOrder(result.order, { uid: me.uid, isOffer: false, overlay: result.overlay, orderId }) };
});

export const OPTIONS = preflight;
