// Order creation, shared by the checkout route (app/api/shop/orders) and the subscription cron. Moved here unchanged
// from the route's POST handler, apart from the coins step (applyCoins) and the optional subscription fields.
// Prices, fees, coupons and coins are worked out here from the published catalogue and the shop's rules, never taken
// from the request. Callers pass the customer's uid after their own authentication.
import "server-only";
import { randomBytes } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { COUPON_VALUES, deliveryFeeFor } from "@/glowvai-app/shared/pricing-rules.mjs";
import { planReservation, reservationFor, stockProblemMessage, type ProductStock } from "./platformStock";
import { readProductStock, writeStockChanges } from "./platformStockTx";
import type { DeliveryAddress, ParsedOrderRequest } from "./orderRequest";
import { applyCoins, maxRedeemable } from "./growth/coins";
import { wrapTx, firestoreRepo } from "./growth/firestoreRepo";
import { razorpayKeyId } from "./razorpay";


// Thrown inside the order transaction to stop it with a customer message and an HTTP status.
export class OrderBlocked extends Error {
  status: number;
  code: OrderFailure;
  constructor(status: number, message: string, code: OrderFailure = "UNAVAILABLE") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class OrderDuplicate extends Error {}

export type OrderFailure =
  | "VALIDATION"
  | "UNAVAILABLE"
  | "NO_PRICE"
  | "OUT_OF_STOCK"
  | "PRICE_CHANGED"
  | "COUPON_INVALID"
  | "TIP_INVALID"
  | "COINS_OVER_CAP"
  | "COINS_NOT_ENOUGH"
  | "PAYMENT_START_FAILED"
  | "DUPLICATE";


export interface PlaceOrderInput extends ParsedOrderRequest {
  uid: string;
  // Subscription orders: the subscription they belong to, and a fixed order id so a repeat run cannot create two.
  subscriptionId?: string | null;
  orderId?: string;
  // Starts the online payment for the amount (rupees). Only used when paymentMethod is ONLINE.
  startPayment?: (amountRupees: number, orderId: string) => Promise<{ id: string; amount: number; currency: string }>;
  now?: number;
}

export type PlaceOrderResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; code: OrderFailure; error: string };

const UNAVAILABLE = "One of the products is no longer available. Remove it from your bag and try again.";

// Prices the bag, checks stock, applies coins and writes the order in one transaction. Nothing is written if any check fails.
export async function placeOrderCore(store: Firestore, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const fail = (status: number, code: OrderFailure, error: string): PlaceOrderResult => ({ ok: false, status, code, error });
  const now = input.now ?? Date.now();
  const repo = firestoreRepo(store);

  const productRefs = [...input.wanted.keys()].map((id) => store.collection("products").doc(id));
  const productSnaps = await store.getAll(...productRefs);
  const items: Record<string, unknown>[] = [];
  for (const snap of productSnaps) {
    const p = snap.data();
    if (!snap.exists || !p || p.status !== "PUBLISHED") return fail(409, "UNAVAILABLE", UNAVAILABLE);
    const unitPrice = Math.round(Number(p.brandPrice) || 0);
    if (unitPrice <= 0) return fail(409, "NO_PRICE", `${p.productName ?? "A product"} has no price yet.`);
    const quantity = input.wanted.get(snap.id) ?? 1;
    items.push({
      productId: snap.id,
      sku: snap.id,
      title: String(p.productName ?? ""),
      productName: String(p.productName ?? ""),
      brand: String(p.brandName ?? ""),
      unitPrice,
      quantity,
      totalPrice: unitPrice * quantity,
      imageUrl: Array.isArray(p.pictures) && p.pictures[0] ? String(p.pictures[0]) : "",
      hasBeautyProtection: false,
      beautyProtectionFee: 0,
    });
  }

  // Quick check on the snapshot read above. The transaction below checks again on fresh reads before anything is written.
  const snapshotStock = new Map<string, ProductStock | undefined>(productSnaps.map((s) => [s.id, s.exists ? (s.data() as ProductStock) : undefined]));
  const pre = planReservation(
    items.map((it) => ({ productId: String(it.productId), quantity: Number(it.quantity) })),
    snapshotStock,
  );
  if (!pre.ok) return fail(409, "OUT_OF_STOCK", stockProblemMessage(pre));

  const subtotal = items.reduce((s, it) => s + Number(it.totalPrice), 0);
  const couponValue = input.couponCode ? (COUPON_VALUES as Record<string, number>)[input.couponCode] : undefined;
  if (input.couponCode && couponValue === undefined) return fail(400, "COUPON_INVALID", "That coupon code is not valid.");
  const discountAmount = Math.min(couponValue ?? 0, subtotal);
  const deliveryFee = deliveryFeeFor({ itemTotal: subtotal, area: input.address.area || input.address.city });
  // Optional tip for the delivery partner: a whole-rupee amount from 0 to 500, added to the bill.
  const tipRaw = input.tipRaw === undefined || input.tipRaw === null || input.tipRaw === "" ? 0 : Number(input.tipRaw);
  if (!Number.isFinite(tipRaw) || tipRaw < 0 || tipRaw > 500) return fail(400, "TIP_INVALID", "The tip must be between ₹0 and ₹500.");
  const tip = Math.round(tipRaw);

  // Coins: a quick check on the balance read now (the transaction checks again on a fresh read). The amount is fixed
  // here because the payment amount is set from it.
  const coinsRequested = input.coinsRequested;
  if (coinsRequested > 0) {
    const wallet = await repo.get(repo.ref(`wallets/${input.uid}`));
    const balance = Number(wallet.data()?.balance ?? 0);
    const cap = maxRedeemable({ itemTotal: subtotal, balance: Number.isFinite(balance) ? balance : 0 });
    if (coinsRequested > cap) return fail(409, "COINS_OVER_CAP", `You can use at most ${cap} coins on this order.`);
  }
  const coinsRedeemed = coinsRequested;
  const grandTotal = subtotal - discountAmount + deliveryFee + tip - coinsRedeemed;

  const day = new Date(now + 5.5 * 3600000).toISOString().slice(2, 10).replace(/-/g, "");
  const orderId = input.orderId ?? `GV-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
  // Identifiers the customer and GlowVai use to follow the order: transaction (payment) reference and tracking number.
  const online = input.paymentMethod === "ONLINE";
  const transactionId = online ? null : `COD-${randomBytes(4).toString("hex").toUpperCase()}`;
  const trackingId = `TRK-${randomBytes(4).toString("hex").toUpperCase()}`;
  // Online orders are created first and become PLACED only when Razorpay confirms the payment (see payments/razorpay).
  let razorpay: { id: string; amount: number; currency: string } | null = null;
  if (online && input.startPayment) {
    try {
      razorpay = await input.startPayment(grandTotal, orderId);
    } catch {
      return fail(502, "PAYMENT_START_FAILED", "The payment could not be started. Please try again.");
    }
  }
  const order = {
    orderId,
    transactionId,
    razorpayOrderId: razorpay?.id ?? null,
    trackingId,
    userId: input.uid,
    customerName: input.address.name,
    customerPhone: input.address.phone,
    deliveryType: "STANDARD",
    vendorId: null,
    vendorName: null,
    vendorStatus: "PENDING",
    zoneId: null,
    items,
    shippingAddress: {
      label: "Home",
      recipientName: input.address.name,
      phoneNumber: input.address.phone,
      streetAddress: input.address.fullAddress,
      fullAddress: input.address.fullAddress,
      city: input.address.city,
      pincode: input.address.pincode,
      landmark: input.address.landmark,
      area: input.address.area,
      isDefault: true,
    },
    pricing: { subtotal, itemTotal: subtotal, deliveryFee, discountAmount, tip, coinsRedeemed, beautyProtectionTotal: 0, grandTotal },
    payment: { method: online ? "ONLINE" : "COD", status: "PENDING", transactionId, paymentId: null },
    status: online ? "PAYMENT_PENDING" : "PLACED",
    couponCode: discountAmount > 0 ? input.couponCode : null,
    referralCodeUsed: null,
    referralProcessed: false,
    source: "web_shop",
    ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {}),
    events: [{ at: now, actor: "Customer", event: online ? "Payment started (online)" : "Order placed (cash on delivery)" }],
    createdAt: now,
    updatedAt: now,
  };

  // One transaction: the products are read fresh, every tracked line is checked (all or nothing), platform stock is
  // decremented, coins are debited and the order is created with its stockReservation. All reads come before all writes.
  try {
    await store.runTransaction(async (tx) => {
      const ref = store.collection("orders").doc(orderId);
      if ((await tx.get(ref)).exists) {
        if (input.orderId) throw new OrderDuplicate("duplicate");
        throw new Error("Order id clash, please retry.");
      }
      const fresh = await readProductStock(tx, store, items.map((it) => String(it.productId)));
      for (const it of items) {
        const p = fresh.get(String(it.productId));
        if (!p || p.status !== "PUBLISHED") throw new OrderBlocked(409, UNAVAILABLE, "UNAVAILABLE");
        if (Math.round(Number(p.brandPrice) || 0) !== Number(it.unitPrice)) {
          throw new OrderBlocked(409, "The price of an item has changed. Refresh your bag and try again.", "PRICE_CHANGED");
        }
      }
      const plan = planReservation(
        items.map((it) => ({ productId: String(it.productId), quantity: Number(it.quantity) })),
        fresh,
      );
      if (!plan.ok) throw new OrderBlocked(409, stockProblemMessage(plan), "OUT_OF_STOCK");
      const coins = await applyCoins(wrapTx(tx, store), (path) => repo.ref(path), { uid: input.uid, requested: coinsRedeemed, itemTotal: subtotal, orderId, now });
      if (!coins.ok) throw new OrderBlocked(coins.status, coins.message, coins.code);
      writeStockChanges(tx, store, plan.decrements, now);
      coins.commit();
      tx.create(ref, { ...order, stockReservation: reservationFor(plan.decrements) });
      tx.set(store.collection("users").doc(input.uid), { lastActiveAt: now, lastOrderAt: now }, { merge: true });
    });
  } catch (err) {
    if (err instanceof OrderBlocked) return fail(err.status, err.code, err.message);
    if (err instanceof OrderDuplicate) return fail(409, "DUPLICATE", "This order was already created.");
    throw err;
  }

  if (online && razorpay) {
    return {
      ok: true,
      body: {
        ok: true,
        orderId,
        trackingId,
        pricing: order.pricing,
        status: order.status,
        payment: { provider: "razorpay", keyId: razorpayKeyId(), razorpayOrderId: razorpay.id, amount: razorpay.amount, currency: razorpay.currency },
      },
    };
  }
  return { ok: true, body: { ok: true, orderId, trackingId, transactionId, pricing: order.pricing, status: order.status } };
}

// The redeem preview at checkout: the bag's item total is priced here from the catalogue, the balance is read from the
// wallet, and the maximum coins follow the cap in growth-config. Nothing is written.
export async function previewCoins(
  store: Firestore,
  uid: string,
  wanted: Map<string, number>,
): Promise<{ ok: true; itemTotal: number; balance: number; maxRedeemable: number } | { ok: false; status: number; error: string }> {
  const snaps = await store.getAll(...[...wanted.keys()].map((id) => store.collection("products").doc(id)));
  let itemTotal = 0;
  for (const snap of snaps) {
    const p = snap.data();
    if (!snap.exists || !p || p.status !== "PUBLISHED") return { ok: false, status: 409, error: UNAVAILABLE };
    const unitPrice = Math.round(Number(p.brandPrice) || 0);
    if (unitPrice <= 0) return { ok: false, status: 409, error: `${p.productName ?? "A product"} has no price yet.` };
    itemTotal += unitPrice * (wanted.get(snap.id) ?? 1);
  }
  const repo = firestoreRepo(store);
  const wallet = await repo.get(repo.ref(`wallets/${uid}`));
  const raw = Number(wallet.data()?.balance ?? 0);
  const balance = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  return { ok: true, itemTotal, balance, maxRedeemable: maxRedeemable({ itemTotal, balance }) };
}
