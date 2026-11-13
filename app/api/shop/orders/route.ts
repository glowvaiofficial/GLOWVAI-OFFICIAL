import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByIpShared, limitByUser, limitByUserShared } from "@/lib/shop/server";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/shop/razorpay";
import { placeOrderCore } from "@/lib/shop/orderCore";
import { parseOrderRequest } from "@/lib/shop/orderRequest";
import { compareNewestFirst, decodeOrderCursor, parseOrderFilter, parsePageLimit, toneOfStatus } from "@/lib/shop/orderHistory";
import { listCustomerOrderPage, type OrderPagingPort, type StoredOrderRow } from "@/lib/shop/orderPaging";
import { FieldPath, type DocumentData } from "firebase-admin/firestore";
import { RETURN_COLLECTION } from "@/lib/shop/returns";
import { PRODUCT_ID_PATTERN, REVIEWS, reviewIdFor } from "@/lib/shop/reviews";
import { canEditReview } from "@/lib/shop/reviewRules";
import { deliveredAtOf, toMillis, type Doc } from "@/lib/shop/orderState";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { AFFILIATE_CONFIG } from "@/lib/shop/affiliate/config";
import { affiliateCodeForOrder } from "@/lib/shop/affiliate/store";

export const dynamic = "force-dynamic";

// Customer-facing status from the shop status, with any admin decision (saved in admin_orders) applied on top.
function customerStatus(shopStatus: string, overlay: Record<string, unknown> | undefined): string {
  const fulfilment = String(overlay?.fulfilment ?? "");
  if (fulfilment === "CANCELLED") return "CANCELLED";
  if (fulfilment === "DELIVERED") return "DELIVERED";
  return shopStatus || "PLACED";
}

// The signed-in customer's orders, newest first, with any admin decision applied.
// Without paging parameters this returns the most recent orders held (at most 100), as before.
// With ?filter=all|active|delivered|cancelled|returns&limit=1..50&cursor=... it returns one page:
// { orders, nextCursor, filter } where nextCursor is null on the last page. Pages are read from Firestore newest first
// (createdAt, then order id) and filtered as they are read, so every order of the customer can be reached. Each delivered
// order also carries `reviews`, the customer's own review state per product (so the rate prompt needs no extra calls),
// and every order carries `hasReturn`.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "orders-get", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "orders", 60);
  if (userLimited) return userLimited;

  const params = req.nextUrl.searchParams;
  const paged = params.has("limit") || params.has("cursor") || params.has("filter");
  const filter = parseOrderFilter(params.get("filter"));
  const limit = parsePageLimit(params.get("limit"));
  const cursor = decodeOrderCursor(params.get("cursor"));
  if (cursor === "invalid") return json({ ok: false, error: "Those orders could not be opened. Start again from the first page." }, 400);

  const returnsSnap = await db().collection(RETURN_COLLECTION).where("uid", "==", customer.uid).limit(100).get();
  const returnedOrderIds = new Set(returnsSnap.docs.map((d) => String((d.data() as Doc).orderId ?? "")));
  const overlays = new Map<string, Record<string, unknown>>();
  const overlayChecked = new Set<string>();
  // Reads the admin decisions for these orders that are not loaded yet.
  const loadOverlays = async (ids: string[]) => {
    const missing = ids.filter((id) => !overlayChecked.has(id));
    if (!missing.length) return;
    missing.forEach((id) => overlayChecked.add(id));
    for (const s of await db().getAll(...missing.map((id) => db().collection("admin_orders").doc(id)))) {
      if (s.exists) overlays.set(s.id, s.data() as Record<string, unknown>);
    }
  };

  if (!paged) {
    const snap = await db().collection("orders").where("userId", "==", customer.uid).limit(100).get();
    const rows = snap.docs.map((d) => ({ orderId: d.id, createdAt: toMillis(d.data().createdAt), data: d.data() }));
    rows.sort((a, b) => compareNewestFirst(a, b));
    await loadOverlays(rows.map((r) => r.orderId));
    const orders = rows.map((r) => orderView(r.orderId, r.data, overlays.get(r.orderId), returnedOrderIds.has(r.orderId)));
    return json({ ok: true, orders: await withReviewState(orders, orders.map((o) => o.status), customer.uid) });
  }

  const port: OrderPagingPort<OrderRow> = {
    async readBatch(uid, after, size) {
      // Only this customer's orders. The index is (userId ASC, createdAt DESC); document id breaks ties in the same order.
      let query = db().collection("orders").where("userId", "==", uid).orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc");
      if (after) query = query.startAfter(after.createdAt, after.orderId);
      const snap = await query.limit(size).get();
      return snap.docs.map((d) => ({ orderId: d.id, createdAt: toMillis(d.data().createdAt), data: d.data() }));
    },
    async classify(rows) {
      await loadOverlays(rows.map((r) => r.orderId));
      return rows.map((r) => ({
        status: customerStatus(String(r.data.status ?? ""), overlays.get(r.orderId)),
        hasReturn: returnedOrderIds.has(r.orderId),
      }));
    },
  };
  const page = await listCustomerOrderPage(port, customer.uid, { filter, limit, cursor });
  const orders = page.items.map((item) => orderView(item.orderId, item.data, overlays.get(item.orderId), item.hasReturn));
  return json({ ok: true, orders: await withReviewState(orders, page.items.map((i) => i.status), customer.uid), nextCursor: page.nextCursor, filter });
}

type OrderRow = StoredOrderRow & { data: DocumentData };

// The order as the customer app shows it. Admin decisions (admin_orders) are applied on top of the shop status.
function orderView(orderId: string, o: DocumentData, overlay: Record<string, unknown> | undefined, hasReturn: boolean) {
  return {
    orderId: o.orderId ?? orderId,
    trackingId: o.trackingId ?? null,
    transactionId: o.transactionId ?? o.payment?.transactionId ?? null,
    vendorId: o.vendorId ?? null,
    status: customerStatus(String(o.status ?? ""), overlay),
    cancellationReason: (overlay?.cancellationReason as string | undefined) ?? o.cancellationReason ?? null,
    items: (o.items ?? []).map((it: Record<string, unknown>) => ({
      productId: it.productId,
      title: it.productName ?? it.title,
      brand: it.brand ?? "",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      imageUrl: it.imageUrl ?? "",
      variantId: it.variantId ?? null,
      variantLabel: it.variantLabel ?? null,
    })),
    pricing: o.pricing ?? null,
    deliverySlot: o.deliverySlot ?? null,
    payment: { method: o.payment?.method ?? "COD", status: o.payment?.status ?? "PENDING" },
    shippingAddress: o.shippingAddress ?? null,
    createdAt: o.createdAt ?? null,
    updatedAt: o.updatedAt ?? null,
    deliveredAt: deliveredAtOf(o),
    hasReturn,
  };
}

// Adds `reviews` (the customer's own review of each product, by product id) to delivered orders. Review ids are
// deterministic (productId__uid), so one getAll covers the whole page.
async function withReviewState<T extends { items: { productId: unknown }[]; orderId: unknown }>(
  list: T[],
  statuses: string[],
  uid: string,
): Promise<(T & { reviews: Record<string, { status: string; rating: number; canEdit: boolean }> })[]> {
  const wanted = new Set<string>();
  list.forEach((o, i) => {
    if (toneOfStatus(statuses[i]) !== "delivered") return;
    for (const it of o.items) if (typeof it.productId === "string" && PRODUCT_ID_PATTERN.test(it.productId)) wanted.add(it.productId);
  });
  const found = new Map<string, { status: string; rating: number; canEdit: boolean }>();
  if (wanted.size) {
    const ids = [...wanted];
    const snaps = await db().getAll(...ids.map((pid) => db().collection(REVIEWS).doc(reviewIdFor(pid, uid))));
    snaps.forEach((s, i) => {
      if (!s.exists) return;
      const d = s.data() as Doc;
      const edit = canEditReview({ createdAtMs: Number(d.createdAtMs), editCount: Number(d.editCount ?? 0) }, Date.now());
      found.set(ids[i], { status: String(d.status ?? "PENDING"), rating: Number(d.rating), canEdit: edit.ok });
    });
  }
  return list.map((o, i) => {
    const reviews: Record<string, { status: string; rating: number; canEdit: boolean }> = {};
    if (toneOfStatus(statuses[i]) === "delivered") {
      for (const it of o.items) {
        const pid = typeof it.productId === "string" ? it.productId : "";
        const r = found.get(pid);
        if (r) reviews[pid] = r;
      }
    }
    return { ...o, reviews };
  });
}

// Places an order. The checks, pricing and transaction live in lib/shop/orderCore.ts (shared with the subscription cron).
// Only cash on delivery is offered until online payment is connected; online orders need RAZORPAY_KEY_ID and secret.
export async function POST(req: NextRequest) {
  const ipLimited = await limitByIpShared(req, "orders-post", 60, 60 * 60 * 1000, "Too many orders in a short time. Try again later.");
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to place your order." }, 401);
  const userLimited = await limitByUserShared(customer.uid, "orders-post", 20, 60 * 60 * 1000, "Too many orders in a short time. Try again later.");
  if (userLimited) return userLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const parsed = parseOrderRequest(body, { onlineAvailable: razorpayConfigured() });
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);

  const online = parsed.value.paymentMethod === "ONLINE";
  // Affiliate attribution from the signed cookie set on the affiliate link visit. A failure here never blocks the order.
  const affiliateCode = await affiliateCodeForOrder(firestoreRepo(db()), { uid: customer.uid, cookie: req.cookies.get(AFFILIATE_CONFIG.cookies.attribution)?.value, secret: process.env.AFFILIATE_COOKIE_SECRET, now: Date.now() }).catch(() => null);
  const result = await placeOrderCore(db(), {
    uid: customer.uid,
    ...parsed.value,
    affiliateCode,
    startPayment: online ? (amount, orderId) => createRazorpayOrder(amount, orderId) : undefined,
  });
  if (!result.ok) return json({ ok: false, error: result.error }, result.status);
  return json(result.body);
}
