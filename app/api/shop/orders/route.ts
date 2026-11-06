import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { COUPON_VALUES, deliveryFeeFor } from "@/glowvai-app/shared/pricing-rules.mjs";
import { customerFrom, db, indianMobile, json, limitByIp, limitByUser, text, tooMany } from "@/lib/shop/server";
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from "@/lib/shop/razorpay";
import type { ProductStock } from "@/lib/shop/platformStock";
import { readProductStock, writeStockChanges } from "@/lib/shop/platformStockTx";
import { orderItemFor, orderReservationFor, parseCartLines, planOrderStock, currentUnitPrice } from "@/lib/shop/variants";
import { writeVariantStockChanges } from "@/lib/shop/variantStockTx";

// Thrown inside the order transaction to stop it with a customer message and an HTTP status.
class OrderBlocked extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export const dynamic = "force-dynamic";

const MAX_LINES = 20;
const MAX_QTY = 10;

// Customer-facing status from the shop status, with any admin decision (saved in admin_orders) applied on top.
function customerStatus(shopStatus: string, overlay: Record<string, unknown> | undefined): string {
  const fulfilment = String(overlay?.fulfilment ?? "");
  if (fulfilment === "CANCELLED") return "CANCELLED";
  if (fulfilment === "DELIVERED") return "DELIVERED";
  return shopStatus || "PLACED";
}

// The signed-in customer's orders, newest first, with any admin decision applied.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "orders-get", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "orders", 60);
  if (userLimited) return userLimited;
  const snap = await db().collection("orders").where("userId", "==", customer.uid).limit(100).get();
  const ids = snap.docs.map((d) => d.id);
  const overlays = new Map<string, Record<string, unknown>>();
  if (ids.length) {
    const refs = ids.map((id) => db().collection("admin_orders").doc(id));
    for (const s of await db().getAll(...refs)) if (s.exists) overlays.set(s.id, s.data() as Record<string, unknown>);
  }
  const orders = snap.docs
    .map((d) => {
      const o = d.data();
      const overlay = overlays.get(d.id);
      return {
        orderId: o.orderId ?? d.id,
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
        payment: { method: o.payment?.method ?? "COD", status: o.payment?.status ?? "PENDING" },
        shippingAddress: o.shippingAddress ?? null,
        createdAt: o.createdAt ?? null,
        updatedAt: o.updatedAt ?? null,
      };
    })
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
  return json({ ok: true, orders });
}

// Places an order. Prices, delivery fee and coupon are worked out here from the published products and the shop's
// pricing rules, never taken from the browser. Only cash on delivery is offered until online payment is connected.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "orders-post", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to place your order." }, 401);
  const userLimited = limitByUser(customer.uid, "orders", 60);
  if (userLimited) return userLimited;
  if (tooMany(`order:${customer.uid}`, 10, 60 * 60 * 1000)) return json({ ok: false, error: "Too many orders in a short time. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const method = String(body.paymentMethod ?? "COD").toUpperCase();
  if (method !== "COD" && method !== "ONLINE") return json({ ok: false, error: "Choose a payment method." }, 400);
  if (method === "ONLINE" && !razorpayConfigured()) {
    return json({ ok: false, error: "Online payment is being set up. Please choose cash on delivery for now." }, 503);
  }

  const lines = Array.isArray(body.items) ? body.items : [];
  if (lines.length === 0) return json({ ok: false, error: "Your bag is empty." }, 400);
  if (lines.length > MAX_LINES) return json({ ok: false, error: `Up to ${MAX_LINES} different products per order.` }, 400);
  const cart = parseCartLines(lines, MAX_QTY);
  if (!cart.ok) return json({ ok: false, error: cart.error }, 400);

  const addr = (body.address ?? {}) as Record<string, unknown>;
  const recipientName = text(addr.name, 80);
  const phone = indianMobile(addr.phone);
  const fullAddress = text(addr.fullAddress, 300);
  const city = text(addr.city, 60);
  const pincode = text(addr.pincode, 6);
  const area = text(addr.area, 80);
  if (recipientName.length < 2) return json({ ok: false, error: "Enter the name for delivery." }, 400);
  if (!phone) return json({ ok: false, error: "Enter a 10-digit Indian mobile number for delivery." }, 400);
  if (fullAddress.length < 8) return json({ ok: false, error: "Enter the full delivery address." }, 400);
  if (!city) return json({ ok: false, error: "Enter the city." }, 400);
  if (!/^\d{6}$/.test(pincode)) return json({ ok: false, error: "Enter a 6-digit pincode." }, 400);

  const store = db();
  const productRefs = [...new Set(cart.lines.map((l) => l.productId))].map((id) => store.collection("products").doc(id));
  const productSnaps = await store.getAll(...productRefs);
  const items: Record<string, unknown>[] = [];
  for (const line of cart.lines) {
    const built = orderItemFor(productSnaps.find((s) => s.id === line.productId)?.data(), line);
    if (!built.ok) return json({ ok: false, error: built.error }, built.status);
    items.push(built.item);
  }

  // Quick check on the snapshot read above. The transaction below checks again on fresh reads before anything is written.
  const snapshotStock = new Map<string, ProductStock | undefined>(productSnaps.map((s) => [s.id, s.exists ? (s.data() as ProductStock) : undefined]));
  const pre = planOrderStock(cart.lines, snapshotStock);
  if (!pre.ok) return json({ ok: false, error: pre.message }, 409);

  const subtotal = items.reduce((s, it) => s + Number(it.totalPrice), 0);
  const couponCode = text(body.couponCode, 20).toUpperCase();
  const couponValue = couponCode ? (COUPON_VALUES as Record<string, number>)[couponCode] : undefined;
  if (couponCode && couponValue === undefined) return json({ ok: false, error: "That coupon code is not valid." }, 400);
  const discountAmount = Math.min(couponValue ?? 0, subtotal);
  const deliveryFee = deliveryFeeFor({ itemTotal: subtotal, area: area || city });
  // Optional tip for the delivery partner: a whole-rupee amount from 0 to 500, added to the bill.
  const tipRaw = body.tip === undefined || body.tip === null || body.tip === "" ? 0 : Number(body.tip);
  if (!Number.isFinite(tipRaw) || tipRaw < 0 || tipRaw > 500) return json({ ok: false, error: "The tip must be between ₹0 and ₹500." }, 400);
  const tip = Math.round(tipRaw);
  const grandTotal = subtotal - discountAmount + deliveryFee + tip;

  const now = Date.now();
  const day = new Date(now + 5.5 * 3600000).toISOString().slice(2, 10).replace(/-/g, "");
  const orderId = `GV-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
  // Identifiers the customer and GlowVai use to follow the order: transaction (payment) reference and tracking number.
  const online = method === "ONLINE";
  const transactionId = online ? null : `COD-${randomBytes(4).toString("hex").toUpperCase()}`;
  const trackingId = `TRK-${randomBytes(4).toString("hex").toUpperCase()}`;
  // Online orders are created first and become PLACED only when Razorpay confirms the payment (see payments/razorpay).
  let razorpay: { id: string; amount: number; currency: string } | null = null;
  if (online) {
    try {
      razorpay = await createRazorpayOrder(grandTotal, orderId);
    } catch {
      return json({ ok: false, error: "The payment could not be started. Please try again." }, 502);
    }
  }
  const order = {
    orderId,
    transactionId,
    razorpayOrderId: razorpay?.id ?? null,
    trackingId,
    userId: customer.uid,
    customerName: recipientName,
    customerPhone: phone,
    deliveryType: "STANDARD",
    vendorId: null,
    vendorName: null,
    vendorStatus: "PENDING",
    zoneId: null,
    items,
    shippingAddress: {
      label: "Home",
      recipientName,
      phoneNumber: phone,
      streetAddress: fullAddress,
      fullAddress,
      city,
      pincode,
      landmark: text(addr.landmark, 120),
      area,
      isDefault: true,
    },
    pricing: { subtotal, itemTotal: subtotal, deliveryFee, discountAmount, tip, coinsRedeemed: 0, beautyProtectionTotal: 0, grandTotal },
    payment: { method: online ? "ONLINE" : "COD", status: "PENDING", transactionId, paymentId: null },
    status: online ? "PAYMENT_PENDING" : "PLACED",
    couponCode: discountAmount > 0 ? couponCode : null,
    referralCodeUsed: null,
    referralProcessed: false,
    source: "web_shop",
    events: [{ at: now, actor: "Customer", event: online ? "Payment started (online)" : "Order placed (cash on delivery)" }],
    createdAt: now,
    updatedAt: now,
  };

  // One transaction: the products are read fresh, every tracked line is checked (all or nothing), platform stock is
  // decremented and the order is created with its stockReservation. Nothing is written if any check fails.
  try {
    await store.runTransaction(async (tx) => {
      const ref = store.collection("orders").doc(orderId);
      if ((await tx.get(ref)).exists) throw new Error("Order id clash, please retry.");
      const fresh = await readProductStock(tx, store, items.map((it) => String(it.productId)));
      for (const it of items) {
        const p = fresh.get(String(it.productId));
        if (!p || p.status !== "PUBLISHED") throw new OrderBlocked(409, "One of the products is no longer available. Remove it from your bag and try again.");
        if (currentUnitPrice(p, (it.variantId as string | null) ?? null) !== Number(it.unitPrice)) throw new OrderBlocked(409, "The price of an item has changed. Refresh your bag and try again.");
      }
      const plan = planOrderStock(cart.lines, fresh);
      if (!plan.ok) throw new OrderBlocked(409, plan.message);
      writeStockChanges(tx, store, plan.decrements, now);
      writeVariantStockChanges(tx, store, plan.variantWrites, now);
      tx.create(ref, { ...order, stockReservation: orderReservationFor(plan) });
      tx.set(store.collection("users").doc(customer.uid), { lastActiveAt: now, lastOrderAt: now }, { merge: true });
    });
  } catch (err) {
    if (err instanceof OrderBlocked) return json({ ok: false, error: err.message }, err.status);
    throw err;
  }

  if (online && razorpay) {
    return json({
      ok: true,
      orderId,
      trackingId,
      pricing: order.pricing,
      status: order.status,
      payment: { provider: "razorpay", keyId: razorpayKeyId(), razorpayOrderId: razorpay.id, amount: razorpay.amount, currency: razorpay.currency },
    });
  }
  return json({ ok: true, orderId, trackingId, transactionId, pricing: order.pricing, status: order.status });
}
