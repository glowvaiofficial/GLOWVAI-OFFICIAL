import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildInvoice, escapeHtml, renderInvoiceHtml, sellerFromEnv, type InvoiceModel } from "../../lib/shop/invoice";
import type { Doc } from "../../lib/shop/orderState";

const DELIVERED = Date.UTC(2026, 10, 3, 6, 0);

const order = (extra: Doc = {}): Doc => ({
  orderId: "GV-261101-ABCDEF",
  userId: "uid-1",
  status: "DELIVERED",
  deliveredAt: DELIVERED,
  createdAt: Date.UTC(2026, 10, 1, 4, 0),
  customerName: "Asha",
  items: [
    { productId: "p-serum", productName: "Vitamin C <b>Serum</b>", brand: "Acme & Co", quantity: 2, unitPrice: 500 },
    { productId: "p-cream", productName: "Cream", brand: "Glow", quantity: 1, unitPrice: 300 },
  ],
  shippingAddress: { recipientName: "Asha", fullAddress: "12 \"Main\" Road", city: "Vijayawada", pincode: "520001", landmark: "" },
  pricing: { subtotal: 1300, itemTotal: 1300, discountAmount: 100, deliveryFee: 40, tip: 20, coinsRedeemed: 0, beautyProtectionTotal: 0, grandTotal: 1260 },
  payment: { method: "COD", status: "PENDING", transactionId: "COD-AB12CD34" },
  ...extra,
});

describe("invoice: totals", () => {
  test("totals come from the recorded order and add up", () => {
    const inv = buildInvoice(order(), null, { name: "GlowVai" });
    assert.ok(inv);
    assert.equal(inv.totals.subtotal, 1300);
    assert.equal(inv.totals.discount, 100);
    assert.equal(inv.totals.deliveryFee, 40);
    assert.equal(inv.totals.tip, 20);
    assert.equal(inv.totals.grandTotal, 1260);
    assert.equal(inv.totalsAddUp, true);
    assert.equal(inv.lines[0].lineTotal, 1000);
    assert.equal(inv.lines[1].lineTotal, 300);
  });

  test("no tax line and no GST number when the order carries neither", () => {
    const inv = buildInvoice(order(), null, { name: "GlowVai" });
    assert.ok(inv);
    assert.equal(inv.totals.taxes, null);
    assert.equal(inv.buyerGstin, null);
    const html = renderInvoiceHtml(inv);
    assert.equal(html.includes("Taxes"), false);
    assert.equal(html.includes("GSTIN"), false);
  });

  test("taxes and the customer GST number appear only when the order carries them", () => {
    const inv = buildInvoice(order({ pricing: { subtotal: 1300, discountAmount: 0, deliveryFee: 0, tip: 0, taxAmount: 117, grandTotal: 1417 }, gstin: "37ABCDE1234F1Z5" }), null, { name: "GlowVai" });
    assert.ok(inv);
    assert.equal(inv.totals.taxes, 117);
    assert.equal(inv.buyerGstin, "37ABCDE1234F1Z5");
    assert.equal(inv.totalsAddUp, true);
    const html = renderInvoiceHtml(inv);
    assert.match(html, /Taxes \(as recorded on the order\)/);
    assert.match(html, /GSTIN: 37ABCDE1234F1Z5/);
  });

  test("a malformed GST number is not printed", () => {
    const inv = buildInvoice(order({ gstin: "<script>alert(1)</script>" }), null, { name: "GlowVai" });
    assert.ok(inv);
    assert.equal(inv.buyerGstin, null);
  });

  test("a total that does not add up is flagged, and shown as recorded", () => {
    const inv = buildInvoice(order({ pricing: { subtotal: 1300, discountAmount: 100, deliveryFee: 40, tip: 20, grandTotal: 999 } }), null, { name: "GlowVai" });
    assert.ok(inv);
    assert.equal(inv.totalsAddUp, false);
    assert.equal(inv.totals.grandTotal, 999);
  });

  test("the tip is labelled as a tip, not a tax", () => {
    const html = renderInvoiceHtml(buildInvoice(order(), null, { name: "GlowVai" })!);
    assert.match(html, /Tip for the delivery partner \(not a tax\)/);
  });

  test("no invoice for an order that is not delivered, or was cancelled", () => {
    assert.equal(buildInvoice(order({ status: "PACKED", deliveredAt: undefined, events: [] }), null, { name: "GlowVai" }), null);
    assert.equal(buildInvoice(order({ status: "CANCELLED" }), null, { name: "GlowVai" }), null);
    assert.equal(buildInvoice(order({ status: "CANCELLED" }), { fulfilment: "CANCELLED" }, { name: "GlowVai" }), null);
  });
});

describe("invoice: seller details from config", () => {
  test("legal details are included only when set in the environment", () => {
    assert.deepEqual(sellerFromEnv({}), { name: "GlowVai" });
    const seller = sellerFromEnv({ GLOWVAI_LEGAL_NAME: " GlowVai Pvt Ltd ", GLOWVAI_GSTIN: "", GLOWVAI_PAN: "ABCDE1234F" });
    assert.deepEqual(seller, { name: "GlowVai", legalName: "GlowVai Pvt Ltd", pan: "ABCDE1234F" });
  });

  test("a seller line is not printed when its value is not set", () => {
    const html = renderInvoiceHtml(buildInvoice(order(), null, { name: "GlowVai" })!);
    assert.equal(html.includes("GSTIN: "), false);
    assert.equal(html.includes("PAN: "), false);
  });
});

describe("invoice: HTML escaping", () => {
  test("escapeHtml covers the five special characters", () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    assert.equal(escapeHtml(undefined), "");
  });

  test("product names, brands and addresses are escaped in the page", () => {
    const html = renderInvoiceHtml(buildInvoice(order(), null, { name: "GlowVai" })!);
    assert.equal(html.includes("<b>Serum</b>"), false);
    assert.match(html, /Vitamin C &lt;b&gt;Serum&lt;\/b&gt;/);
    assert.match(html, /Acme &amp; Co/);
    assert.match(html, /12 &quot;Main&quot; Road/);
    assert.equal(html.includes("<script"), false);
  });

  test("a hostile seller value is escaped too", () => {
    const seller = sellerFromEnv({ GLOWVAI_LEGAL_NAME: "<img src=x onerror=alert(1)>" });
    const html = renderInvoiceHtml(buildInvoice(order(), null, seller)!);
    assert.equal(html.includes("<img"), false);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });

  test("the delivered date and the order number are printed", () => {
    const inv: InvoiceModel = buildInvoice(order(), null, { name: "GlowVai" })!;
    assert.equal(inv.orderNumber, "GV-261101-ABCDEF");
    assert.ok(inv.deliveredDate && /2026/.test(inv.deliveredDate));
    const html = renderInvoiceHtml(inv);
    assert.match(html, /Order GV-261101-ABCDEF/);
    assert.match(html, /<meta charset="utf-8">/);
  });
});
