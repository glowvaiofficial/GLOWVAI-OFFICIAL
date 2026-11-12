import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ordersPollDelay, heartbeatActive, ORDERS_POLL_ONLINE_MS, ORDERS_POLL_OFFLINE_MS, HEARTBEAT_MS } from "../../lib/vendor-web/ops/poll";
import { applyOrdersPage, nextSince, upsertOrder, dropOrder, ordersInTab, tabCounts, tabOf, type OrderBook } from "../../lib/vendor-web/ops/merge";
import { allTicked, checkedProductIds, packLines } from "../../lib/vendor-web/ops/pack";
import { checkEdit, parseStockInput, parsePriceInput, isLowStock, chunkForSave, SAVE_BATCH_MAX } from "../../lib/vendor-web/ops/inventory";
import { declineNoteError, declineBody } from "../../lib/vendor-web/ops/decline";
import { validateProductRequest, pictureUrlAllowed, type ProductRequestForm } from "../../lib/vendor-web/ops/productRequest";
import { ANALYTICS_LABELS, ORDER_VALUE_LABEL, TRUNCATED_NOTE, summaryRows } from "../../lib/vendor-web/ops/analytics";
import { offerView } from "../../lib/vendor-web/ops/offerView";
import { stockGaps, parseMissing, describeGap } from "../../lib/vendor-web/ops/stock";
import { messageFor, storeStateCopy } from "../../lib/vendor-web/ops/copy";
import { formatSeconds, istDayStart } from "../../lib/vendor-web/ops/time";
import type { OpsOrder, OpsOrderItem, OrdersPage, AnalyticsResult } from "../../lib/vendor-web/ops/types";

const item = (over: Partial<OpsOrderItem> = {}): OpsOrderItem => ({
  productId: "p1",
  variantId: null,
  variantLabel: null,
  title: "Face wash",
  brand: "Brand",
  quantity: 1,
  unitPrice: 100,
  imageUrl: "",
  ...over,
});

const order = (over: Partial<OpsOrder> = {}): OpsOrder => ({
  orderId: "o1",
  reference: "o1",
  status: "PLACED",
  vendorStatus: "PENDING",
  isOffer: true,
  items: [item()],
  itemCount: 1,
  itemsValue: 100,
  placedAt: 1_000,
  updatedAt: 1_000,
  cancelled: false,
  substitutionPreference: null,
  timeline: [],
  ...over,
});

describe("poll interval rules", () => {
  test("visible and online polls every 20 s", () => {
    assert.equal(ordersPollDelay({ visible: true, online: true, failures: 0 }), ORDERS_POLL_ONLINE_MS);
    assert.equal(ORDERS_POLL_ONLINE_MS, 20_000);
  });

  test("visible and offline polls every 60 s", () => {
    assert.equal(ordersPollDelay({ visible: true, online: false, failures: 0 }), ORDERS_POLL_OFFLINE_MS);
    assert.equal(ORDERS_POLL_OFFLINE_MS, 60_000);
  });

  test("hidden tab never polls, online or offline", () => {
    assert.equal(ordersPollDelay({ visible: false, online: true, failures: 0 }), null);
    assert.equal(ordersPollDelay({ visible: false, online: false, failures: 0 }), null);
    assert.equal(ordersPollDelay({ visible: false, online: true, failures: 3 }), null);
  });

  test("backoff after errors: 40 s, 80 s, then 5 min", () => {
    const at = (failures: number) => ordersPollDelay({ visible: true, online: true, failures });
    assert.equal(at(1), 40_000);
    assert.equal(at(2), 80_000);
    assert.equal(at(3), 300_000);
    assert.equal(at(9), 300_000);
  });

  test("backoff applies offline too", () => {
    assert.equal(ordersPollDelay({ visible: true, online: false, failures: 1 }), 40_000);
  });

  test("heartbeat runs only while visible and online, once a minute", () => {
    assert.equal(HEARTBEAT_MS, 60_000);
    assert.equal(heartbeatActive({ visible: true, online: true }), true);
    assert.equal(heartbeatActive({ visible: false, online: true }), false);
    assert.equal(heartbeatActive({ visible: true, online: false }), false);
  });
});

describe("incremental merge", () => {
  test("nextSince is serverTime minus 5 s, never negative", () => {
    assert.equal(nextSince({ serverTime: 100_000, offers: [], orders: [] }), 95_000);
    assert.equal(nextSince({ serverTime: 2_000, offers: [], orders: [] }), 0);
  });

  test("incremental page merges by orderId and applies removed", () => {
    const a = order({ orderId: "a", isOffer: true });
    const b = order({ orderId: "b", isOffer: true });
    const book = applyOrdersPage({}, { serverTime: 1, offers: [a, b], orders: [], full: true });
    const bNow = order({ orderId: "b", isOffer: false, status: "VENDOR_ACCEPTED", vendorStatus: "ACCEPTED" });
    const c = order({ orderId: "c", isOffer: false, status: "PACKED", vendorStatus: "PACKED" });
    const next = applyOrdersPage(book, {
      serverTime: 2,
      offers: [],
      orders: [bNow, c],
      removed: ["a"],
      full: false,
    });
    assert.deepEqual(Object.keys(next).sort(), ["b", "c"]);
    assert.equal(next.b.status, "VENDOR_ACCEPTED");
    assert.equal(next.a, undefined);
    // The input book is not mutated.
    assert.equal(Object.keys(book).length, 2);
  });

  test("a full page replaces the book entirely", () => {
    const book: OrderBook = { x: order({ orderId: "x" }) };
    const next = applyOrdersPage(book, { serverTime: 1, offers: [order({ orderId: "y" })], orders: [], full: true });
    assert.deepEqual(Object.keys(next), ["y"]);
  });

  test("accept and decline keep the book in step", () => {
    const book: OrderBook = { o1: order() };
    const accepted = upsertOrder(book, order({ isOffer: false, status: "VENDOR_ACCEPTED", vendorStatus: "ACCEPTED" }));
    assert.equal(tabOf(accepted.o1), "preparing");
    assert.deepEqual(Object.keys(dropOrder(accepted, "o1")), []);
  });

  test("tabs: offers, preparing, packed, completed, cancelled", () => {
    const book: OrderBook = {
      offer: order({ orderId: "offer" }),
      prep: order({ orderId: "prep", isOffer: false, status: "VENDOR_ACCEPTED" }),
      packed: order({ orderId: "packed", isOffer: false, status: "PACKED" }),
      done: order({ orderId: "done", isOffer: false, status: "OUT_FOR_DELIVERY" }),
      gone: order({ orderId: "gone", isOffer: false, status: "CANCELLED", cancelled: true }),
    };
    assert.deepEqual(tabCounts(book), { offers: 1, preparing: 1, packed: 1, completed: 1, cancelled: 1 });
    assert.deepEqual(ordersInTab(book, "offers").map((o) => o.orderId), ["offer"]);
  });
});

describe("pack gating", () => {
  const items = [item({ productId: "p1" }), item({ productId: "p2", variantId: "v1", variantLabel: "50 ml" }), item({ productId: "p2", variantId: "v2" })];
  const lines = packLines(items);

  test("one line per product and option", () => {
    assert.equal(lines.length, 3);
  });

  test("Mark packed is only allowed when every line is ticked", () => {
    assert.equal(allTicked(lines, new Set(["p1", "p2::v1"])), false);
    assert.equal(allTicked(lines, new Set(["p1", "p2::v1", "p2::v2"])), true);
  });

  test("an empty order can never be marked packed", () => {
    assert.equal(allTicked([], new Set()), false);
  });

  test("checkedProductIds sends each product once", () => {
    assert.deepEqual(checkedProductIds(lines), ["p1", "p2"]);
  });
});

describe("inventory validation bounds", () => {
  test("stock is a whole number from 0 to 100000", () => {
    assert.equal(parseStockInput("0").ok, true);
    assert.equal(parseStockInput("100000").ok, true);
    assert.equal(parseStockInput("100001").ok, false);
    assert.equal(parseStockInput("-1").ok, false);
    assert.equal(parseStockInput("2.5").ok, false);
    assert.equal(parseStockInput("").ok, false);
    assert.equal(parseStockInput("1e3").ok, false);
  });

  test("price override must be more than 0; empty means none", () => {
    assert.deepEqual(parsePriceInput(""), { ok: true, value: null });
    assert.deepEqual(parsePriceInput("199.5"), { ok: true, value: 199.5 });
    assert.equal(parsePriceInput("0").ok, false);
    assert.equal(parsePriceInput("-5").ok, false);
    assert.equal(parsePriceInput("12.345").ok, false);
  });

  test("checkEdit omits the price when none is set", () => {
    const r = checkEdit({ productId: "p1", stock: "4", isAvailable: true, price: "" });
    assert.deepEqual(r, { ok: true, item: { productId: "p1", stock: 4, isAvailable: true } });
  });

  test("checkEdit reports the field that is wrong", () => {
    const r = checkEdit({ productId: "p1", stock: "abc", isAvailable: true, price: "0" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.stock && r.errors.price);
  });

  test("low stock is 3 or less", () => {
    assert.equal(isLowStock(3), true);
    assert.equal(isLowStock(0), true);
    assert.equal(isLowStock(4), false);
  });

  test("saves are split into requests of at most 100 lines", () => {
    assert.equal(SAVE_BATCH_MAX, 100);
    const sizes = chunkForSave(Array.from({ length: 230 }, (_, i) => i)).map((c) => c.length);
    assert.deepEqual(sizes, [100, 100, 30]);
  });
});

describe("decline note rule", () => {
  test("OTHER needs 3 to 200 characters after trimming", () => {
    assert.ok(declineNoteError("OTHER", "  ab  "));
    assert.equal(declineNoteError("OTHER", "abc"), null);
    assert.ok(declineNoteError("OTHER", "x".repeat(201)));
    assert.equal(declineNoteError("OTHER", "x".repeat(200)), null);
  });

  test("other reasons need no note and send none", () => {
    assert.equal(declineNoteError("STORE_BUSY", ""), null);
    assert.deepEqual(declineBody("STORE_BUSY", "ignored"), { reason: "STORE_BUSY" });
    assert.deepEqual(declineBody("OTHER", "  shop shut  "), { reason: "OTHER", note: "shop shut" });
  });
});

describe("product request validation", () => {
  const valid: ProductRequestForm = {
    name: "Vitamin C Serum",
    brand: "Acme",
    category: "skincare",
    mrp: "499",
    barcode: "",
    pictureUrls: ["https://images.unsplash.com/photo-1"],
    reason: "Customers keep asking for it.",
  };

  test("a complete form passes and is normalised", () => {
    const r = validateProductRequest({ ...valid, name: "  Vitamin   C Serum " });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.name, "Vitamin C Serum");
      assert.equal(r.value.barcode, null);
      assert.equal(r.value.mrp, 499);
    }
  });

  test("MRP must be a whole rupee amount from 1", () => {
    for (const mrp of ["0", "12.5", "abc", "1000001"]) {
      const r = validateProductRequest({ ...valid, mrp });
      assert.equal(r.ok, false, mrp);
    }
  });

  test("barcode is 8 to 14 digits or empty", () => {
    assert.equal(validateProductRequest({ ...valid, barcode: "1234567" }).ok, false);
    assert.equal(validateProductRequest({ ...valid, barcode: "12345678" }).ok, true);
    assert.equal(validateProductRequest({ ...valid, barcode: "12345678901234" }).ok, true);
    assert.equal(validateProductRequest({ ...valid, barcode: "123456789012345" }).ok, false);
  });

  test("at most 3 pictures, only from allowed https hosts", () => {
    assert.equal(pictureUrlAllowed("https://storage.googleapis.com/a.jpg"), true);
    assert.equal(pictureUrlAllowed("http://images.unsplash.com/a.jpg"), false);
    assert.equal(pictureUrlAllowed("https://evil.example/a.jpg"), false);
    assert.equal(pictureUrlAllowed("https://user:pw@images.unsplash.com/a.jpg"), false);
    assert.equal(pictureUrlAllowed("https://images.unsplash.com:8443/a.jpg"), false);
    const four = [1, 2, 3, 4].map((i) => `https://images.unsplash.com/${i}.jpg`);
    const r = validateProductRequest({ ...valid, pictureUrls: four });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.pictureUrls);
  });

  test("reason is 10 to 500 characters and category must be known", () => {
    assert.equal(validateProductRequest({ ...valid, reason: "short" }).ok, false);
    assert.equal(validateProductRequest({ ...valid, category: "toys" }).ok, false);
  });
});

describe("analytics display labels", () => {
  const result: AnalyticsResult = {
    days: 7,
    ordersPerDay: [{ date: "2026-11-10", orders: 3, accepted: 2, declined: 1 }],
    totals: { orders: 3, accepted: 2, declined: 1 },
    averageAcceptSeconds: 95,
    fulfilmentRate: 0.5,
    fulfilled: 1,
    settled: 2,
    itemsSold: [{ productId: "p1", title: "Face wash", quantity: 4 }],
    orderValue: { amount: 1200, orderCount: 2 },
    bounds: { perQueryLimit: 500, truncated: true },
  };

  test("order value is labelled as order value, never earnings", () => {
    assert.equal(ORDER_VALUE_LABEL, "Order value, not your earnings");
    const text = summaryRows(result, (n) => `₹${n}`, formatSeconds).map((r) => `${r.label} ${r.value}`).join("\n");
    const mentions = text.match(/earn\w*/gi) ?? [];
    assert.ok(mentions.length > 0);
    for (const m of mentions) assert.equal(m.toLowerCase(), "earnings");
    assert.ok(text.includes("Order value, not your earnings"));
    assert.ok(!/payout|settlement|commission|fee/i.test(text));
  });

  test("truncated results carry the latest-500 note", () => {
    assert.equal(TRUNCATED_NOTE, "Based on the latest 500 orders");
    assert.equal(result.bounds.truncated, true);
  });

  test("fulfilment and time formatting", () => {
    assert.equal(ANALYTICS_LABELS.fulfilment, "Fulfilment rate");
    assert.equal(formatSeconds(null), "No data yet");
    assert.equal(formatSeconds(125), "2 min 5 s");
  });
});

describe("no personal data in offer views", () => {
  test("offer view keeps only the allow-listed fields", () => {
    const raw = {
      ...order(),
      customerPhone: "9999999999",
      phone: "+91 98765 43210",
      email: "someone@example.com",
      shippingAddress: { line1: "12 Park Road", landmark: "Near the temple", pincode: "560001" },
      landmark: "Near the temple",
      userId: "uid-123",
    } as unknown as OpsOrder;
    const text = JSON.stringify(offerView(raw));
    for (const secret of ["9999999999", "98765", "someone@example.com", "Park Road", "temple", "560001", "uid-123"]) {
      assert.ok(!text.includes(secret), `leaked ${secret}`);
    }
  });

  test("first name is shown only after this store accepted the order", () => {
    const offer = offerView(order({ customerFirstName: "Asha" }));
    assert.equal(offer.customerFirstName, undefined);
    const accepted = offerView(order({ isOffer: false, acceptedAt: 5, customerFirstName: "Asha" }));
    assert.equal(accepted.customerFirstName, "Asha");
  });
});

describe("stock check on the device", () => {
  test("reports need and have per line", () => {
    const gaps = stockGaps(
      [item({ productId: "p1", quantity: 2, title: "Face wash" }), item({ productId: "p2", quantity: 1, title: "Toner" })],
      [{ productId: "p1", variantId: null, stock: 1, isAvailable: true, updatedAt: 0, lastRestockedAt: 0 }],
    );
    assert.equal(gaps.length, 2);
    assert.equal(describeGap(gaps[0]), "Face wash: need 2, have 1");
    assert.equal(describeGap(gaps[1]), "Toner: need 1, have 0");
  });

  test("server missing list is parsed defensively", () => {
    const parsed = parseMissing({ missing: [{ productId: "p1", variantId: "v1", title: "Serum", need: 2, have: 1 }, null, { nope: 1 }] });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].key, "p1::v1");
    assert.deepEqual(parseMissing(undefined), []);
  });
});

describe("user-facing copy", () => {
  test("rate limiting uses the agreed sentence", () => {
    assert.equal(messageFor({ code: "RATE_LIMITED" }), "Too many requests, try again in a minute.");
  });

  test("paused stores are explained as paused by GlowVai", () => {
    assert.match(storeStateCopy("APPROVED_PAUSED").title, /Paused by GlowVai/);
  });

  test("istDayStart is the IST midnight at or before now", () => {
    const now = Date.UTC(2026, 10, 12, 10, 0); // 15:30 IST
    const start = istDayStart(now);
    assert.equal(new Date(start).toISOString(), "2026-11-11T18:30:00.000Z");
  });
});

// The orders page shape is what the provider feeds to applyOrdersPage; keep the type import exercised.
export type _PageShape = OrdersPage;
