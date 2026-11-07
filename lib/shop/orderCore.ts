// Order creation, shared by the checkout route (app/api/shop/orders) and the subscription cron. The route keeps the
// HTTP parts (auth, rate limits, body); everything that decides the price, the stock, the coins and the order lives here.
// Prices, variants, fees, coupons, coins and slots are worked out from the published catalogue and the shop's rules,
// never taken from the request. Callers pass the customer's uid after their own authentication.
import "server-only";
import { randomBytes } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { COUPON_VALUES, deliveryFeeFor } from "@/glowvai-app/shared/pricing-rules.mjs";
import { stockProblemMessage, type ProductStock } from "./platformStock";
import { readProductStock, writeStockChanges } from "./platformStockTx";
import { writeVariantStockChanges } from "./variantStockTx";
import { currentUnitPrice, orderItemFor, orderReservationFor, planOrderStock, UNAVAILABLE_PRODUCT_MESSAGE, type CartLine, type ProductDoc } from "./variants";
import { ADDRESS_ID_PATTERN, parseDeliveryAddress, type DeliveryAddress, type ParsedOrderRequest } from "./orderRequest";
import { savedAddressForOrder } from "./addressRepo";
import { findOfferedSlot } from "./slots";
import { notifyCustomer } from "./notify";
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
  | "ADDRESS_NOT_SAVED"
  | "SLOT_NOT_OFFERED"
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

const UNAVAILABLE = UNAVAILABLE_PRODUCT_MESSAGE;

// Prices the bag, checks stock (platform and variant), applies coins and writes the order in one transaction.
// Nothing is written if any check fails.
export async function placeOrderCore(store: Firestore, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const fail = (status: number, code: OrderFailure, error: string): PlaceOrderResult => ({ ok: false, status, code, error });
  const now = input.now ?? Date.now();
  const repo = firestoreRepo(store);
  const lines: CartLine[] = input.lines;

  // The address: a saved one is read again from the customer's own addresses and checked with the same rules as a typed one.
  let address: DeliveryAddress;
  let addressLabel = "Home";
  if (input.addressId) {
    const saved = ADDRESS_ID_PATTERN.test(input.addressId) ? await savedAddressForOrder(input.uid, input.addressId) : { ok: false as const };
    if (!saved.ok) return fail(409, "ADDRESS_NOT_SAVED", "That address is no longer saved. Choose a delivery address again.");
    const checked = parseDeliveryAddress({ name: saved.name, phone: saved.phone, fullAddress: saved.fullAddress, city: saved.city, pincode: saved.pincode, landmark: saved.landmark, area: saved.area });
    if (!checked.ok) return fail(checked.status, "VALIDATION", checked.error);
    address = checked.value;
    addressLabel = saved.label;
  } else if (input.address) {
    address = input.address;
  } else {
    return fail(400, "VALIDATION", "Enter the full delivery address.");
  }

  // The delivery time, when one is sent, must be a slot offered right now.
  let deliverySlot: ReturnType<typeof findOfferedSlot> = null;
  if (input.deliverySlotId) {
    deliverySlot = findOfferedSlot(input.deliverySlotId, now);
    if (!deliverySlot) return fail(409, "SLOT_NOT_OFFERED", "That delivery time is no longer available. Choose another time.");
  }

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const productSnaps = await store.getAll(...productIds.map((id) => store.collection("products").doc(id)));
  const items: Record<string, unknown>[] = [];
  for (const line of lines) {
    const snap = productSnaps.find((s) => s.id === line.productId);
    const built = orderItemFor(snap?.data() as ProductDoc | undefined, line);
    if (!built.ok) return fail(built.status, built.status === 409 && built.error.includes("has no price") ? "NO_PRICE" : "UNAVAILABLE", built.error);
    items.push(built.item);
  }

  // Quick check on the snapshot read above. The transaction below checks again on fresh reads before anything is written.
  const snapshotStock = new Map<string, ProductStock | undefined>(productSnaps.map((s) => [s.id, s.exists ? (s.data() as ProductStock) : undefined]));
  const pre = planOrderStock(lines, snapshotStock);
  if (!pre.ok) return fail(409, "OUT_OF_STOCK", pre.message);

  const subtotal = items.reduce((s, it) => s + Number(it.totalPrice), 0);
  const couponValue = input.couponCode ? (COUPON_VALUES as Record<string, number>)[input.couponCode] : undefined;
  if (input.couponCode && couponValue === undefined) return fail(400, "COUPON_INVALID", "That coupon code is not valid.");
  const discountAmount = Math.min(couponValue ?? 0, subtotal);
  const deliveryFee = deliveryFeeFor({ itemTotal: subtotal, area: address.area || address.city });
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
    customerName: address.name,
    customerPhone: address.phone,
    deliveryType: "STANDARD",
    vendorId: null,
    vendorName: null,
    vendorStatus: "PENDING",
    zoneId: null,
    items,
    deliverySlot: deliverySlot
      ? { id: deliverySlot.id, kind: deliverySlot.kind, day: deliverySlot.day, label: deliverySlot.label, estimate: deliverySlot.estimate, startsAt: deliverySlot.startsAt, endsAt: deliverySlot.endsAt }
      : null,
    ...(input.customerLocation ? { customerLocation: { lat: input.customerLocation.lat, lng: input.customerLocation.lng, sharedAt: now } } : {}),
    shippingAddress: {
      label: addressLabel,
      addressId: input.addressId ?? null,
      recipientName: address.name,
      phoneNumber: address.phone,
      streetAddress: address.fullAddress,
      fullAddress: address.fullAddress,
      city: address.city,
      pincode: address.pincode,
      landmark: address.landmark,
      area: address.area,
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

  // One transaction: the products are read fresh, every line is checked (all or nothing), platform and variant stock are
  // decremented, coins are debited and the order is created with its stockReservation. All reads come before all writes.
  try {
    await store.runTransaction(async (tx) => {
      const ref = store.collection("orders").doc(orderId);
      if ((await tx.get(ref)).exists) {
        if (input.orderId) throw new OrderDuplicate("duplicate");
        throw new Error("Order id clash, please retry.");
      }
      const fresh = await readProductStock(tx, store, productIds);
      for (const it of items) {
        const price = currentUnitPrice(fresh.get(String(it.productId)) as ProductDoc | undefined, (it.variantId as string | null) ?? null);
        if (price === null) throw new OrderBlocked(409, UNAVAILABLE, "UNAVAILABLE");
        if (price !== Number(it.unitPrice)) throw new OrderBlocked(409, "The price of an item has changed. Refresh your bag and try again.", "PRICE_CHANGED");
      }
      const plan = planOrderStock(lines, fresh);
      if (!plan.ok) throw new OrderBlocked(409, plan.message, "OUT_OF_STOCK");
      const coins = await applyCoins(wrapTx(tx, store), (path) => repo.ref(path), { uid: input.uid, requested: coinsRedeemed, itemTotal: subtotal, orderId, now });
      if (!coins.ok) throw new OrderBlocked(coins.status, coins.message, coins.code);
      writeStockChanges(tx, store, plan.decrements, now);
      writeVariantStockChanges(tx, store, plan.variantWrites, now);
      coins.commit();
      tx.create(ref, { ...order, stockReservation: orderReservationFor(plan) });
      tx.set(store.collection("users").doc(input.uid), { lastActiveAt: now, lastOrderAt: now }, { merge: true });
    });
  } catch (err) {
    if (err instanceof OrderBlocked) return fail(err.status, err.code, err.message);
    if (err instanceof OrderDuplicate) return fail(409, "DUPLICATE", "This order was already created.");
    throw err;
  }

  // Cash on delivery is placed now (online orders are notified when the payment is confirmed). notifyCustomer never throws.
  if (!online) await notifyCustomer(input.uid, { type: "order_placed", relatedId: orderId });

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

// The redeem preview at checkout: the bag is priced here from the catalogue (variants included), the balance is read from
// the wallet, and the maximum coins follow the cap in growth-config. Nothing is written.
export async function previewCoins(
  store: Firestore,
  uid: string,
  lines: CartLine[],
): Promise<{ ok: true; itemTotal: number; balance: number; maxRedeemable: number } | { ok: false; status: number; error: string }> {
  const snaps = await store.getAll(...[...new Set(lines.map((l) => l.productId))].map((id) => store.collection("products").doc(id)));
  let itemTotal = 0;
  for (const line of lines) {
    const snap = snaps.find((s) => s.id === line.productId);
    const built = orderItemFor(snap?.data() as ProductDoc | undefined, line);
    if (!built.ok) return { ok: false, status: built.status, error: built.error };
    itemTotal += Number(built.item.totalPrice);
  }
  const repo = firestoreRepo(store);
  const wallet = await repo.get(repo.ref(`wallets/${uid}`));
  const raw = Number(wallet.data()?.balance ?? 0);
  const balance = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  return { ok: true, itemTotal, balance, maxRedeemable: maxRedeemable({ itemTotal, balance }) };
}
