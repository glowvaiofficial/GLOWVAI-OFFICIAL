import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildExport, maskEmail, maskPhone, type ExportInput } from "../../lib/shop/privacy/rules";

const base = (): ExportInput => ({
  uid: "uid_abc123",
  now: Date.UTC(2026, 10, 7),
  profile: {
    name: "Priya Sharma",
    phone: "9876543210",
    email: "priya@example.com",
    address: { fullAddress: "12 MG Road", city: "Bengaluru", pincode: "560001", landmark: "Near park", internalFlag: "x" },
    role: "customer",
    source: "web_shop",
    phoneVerified: false,
    riskScore: 91,
    staffNotes: "Chargeback history, do not refund",
    consents: { marketing: true, analytics: false, marketingUpdatedAt: Date.UTC(2026, 9, 1) },
    createdAt: Date.UTC(2026, 0, 5),
  },
  addresses: [{ label: "Home", recipientName: "Priya", phone: "9876543210", fullAddress: "12 MG Road", city: "Bengaluru", pincode: "560001", landmark: "", isDefault: true, createdAt: 1, updatedAt: 2, adminOverlay: "vip" }],
  orders: [
    {
      id: "ord_1",
      orderId: "GV-1001",
      status: "DELIVERED",
      createdAt: Date.UTC(2026, 8, 3),
      pricing: { grandTotal: 499, staffMargin: 120 },
      items: [{ productId: "p1", name: "Niacinamide serum", quantity: 1, unitCostPrice: 90 }],
      events: [{ actor: "Ops", event: "Packed by rider 7" }],
      internalNotes: "Customer called twice",
      payment: { method: "ONLINE", transactionId: "pay_secret" },
      riskFlags: ["velocity"],
    },
  ],
  reviews: [{ productId: "p1", rating: 5, title: "Good", body: "Works well", status: "APPROVED", createdAtMs: Date.UTC(2026, 8, 10), moderatorNote: "approved by Ravi", createdBy: "uid_abc123" }],
  wishlist: ["p1", "p2"],
  subscriptions: [{ id: "sub_1", productId: "p1", quantity: 1, intervalWeeks: 4, status: "ACTIVE", createdAt: Date.UTC(2026, 7, 1), nextRunAt: 999, ownerNotes: "vip" }],
  activity: [{ type: "CONSENT_CHANGED", at: Date.UTC(2026, 9, 1), detail: "marketing on", ip: "10.0.0.1" }],
  tickets: [
    {
      id: "tk_1",
      subject: "Late parcel",
      category: "DELIVERY",
      status: "OPEN",
      orderId: "GV-1001",
      createdAt: Date.UTC(2026, 9, 2),
      priority: "HIGH",
      slaDeadline: Date.UTC(2026, 9, 3),
      internalNote: "Rider no-show, blame dispatch",
      messages: [
        { at: "2026-10-02T10:00:00Z", kind: "CUSTOMER", text: "Still not here" },
        { at: "2026-10-02T11:00:00Z", kind: "INTERNAL", text: "Escalate to ops lead" },
      ],
    },
  ],
});

const flatten = (v: unknown): string => JSON.stringify(v);

describe("privacy export: shape", () => {
  test("contains every section the customer is promised", () => {
    const out = buildExport(base()) as Record<string, unknown>;
    for (const key of ["profile", "consents", "addresses", "orders", "reviews", "wishlist", "subscriptions", "activity", "supportTickets"]) {
      assert.ok(key in out, `missing ${key}`);
    }
    assert.equal(out.exportVersion, 1);
  });

  test("profile keeps the customer's details and drops internal fields", () => {
    const out = buildExport(base()) as { profile: Record<string, unknown> };
    assert.equal(out.profile.name, "Priya Sharma");
    assert.equal(out.profile.email, "priya@example.com");
    const text = flatten(out.profile);
    for (const forbidden of ["web_shop", "phoneVerified", "riskScore", "staffNotes", "internalFlag", "Chargeback"]) {
      assert.ok(!text.includes(forbidden), `profile leaked ${forbidden}`);
    }
  });

  test("consent dates are exported with the choices", () => {
    const out = buildExport(base()) as { consents: Record<string, unknown> };
    assert.equal(out.consents.marketing, true);
    assert.equal(out.consents.analytics, false);
    assert.equal(out.consents.marketingUpdatedAt, new Date(Date.UTC(2026, 9, 1)).toISOString());
    assert.equal(out.consents.analyticsUpdatedAt, null);
  });
});

describe("privacy export: no internal notes or staff data", () => {
  test("orders show a summary: no events, notes, margins, payment ids or risk flags", () => {
    const text = flatten((buildExport(base()) as { orders: unknown }).orders);
    for (const forbidden of ["Packed by rider", "internalNotes", "Customer called", "staffMargin", "120", "pay_secret", "riskFlags", "velocity", "unitCostPrice", "events"]) {
      assert.ok(!text.includes(forbidden), `orders leaked ${forbidden}`);
    }
    assert.ok(text.includes("GV-1001"));
    assert.ok(text.includes("Niacinamide serum"));
  });

  test("support tickets show status only: no internal note, priority, SLA or staff-only messages", () => {
    const text = flatten((buildExport(base()) as { supportTickets: unknown }).supportTickets);
    for (const forbidden of ["Rider no-show", "HIGH", "slaDeadline", "Escalate", "INTERNAL", "messages"]) {
      assert.ok(!text.includes(forbidden), `tickets leaked ${forbidden}`);
    }
    assert.ok(text.includes("Late parcel"));
  });

  test("reviews, subscriptions, addresses and activity drop moderation, owner and network fields", () => {
    const out = buildExport(base());
    const text = flatten({ r: out.reviews, s: out.subscriptions, a: out.addresses, act: out.activity });
    for (const forbidden of ["moderatorNote", "approved by Ravi", "ownerNotes", "vip", "adminOverlay", "10.0.0.1"]) {
      assert.ok(!text.includes(forbidden), `leaked ${forbidden}`);
    }
    assert.ok(text.includes("Works well"));
  });

  test("an empty account exports cleanly", () => {
    const out = buildExport({ ...base(), profile: null, addresses: [], orders: [], reviews: [], wishlist: [], subscriptions: [], activity: [], tickets: [] });
    assert.equal((out.profile as Record<string, unknown>).name, "");
    assert.deepEqual(out.wishlist, []);
  });

  test("long free text is cut to a bounded length", () => {
    const big = { ...base(), reviews: [{ productId: "p1", rating: 4, title: "t", body: "x".repeat(10_000), status: "APPROVED", createdAtMs: 1, createdBy: "u" }] };
    const review = (buildExport(big) as { reviews: Array<{ body: string }> }).reviews[0];
    assert.equal(review.body.length, 2000);
  });
});

describe("privacy export: masking helpers", () => {
  test("email keeps the first letter and the domain", () => {
    assert.equal(maskEmail("priya@example.com"), "p***@example.com");
    assert.equal(maskEmail("not-an-email"), "");
    assert.equal(maskEmail(undefined), "");
  });

  test("phone keeps only the last four digits", () => {
    assert.equal(maskPhone("9876543210"), "+91 ******3210");
    assert.equal(maskPhone("+91 98765 43210"), "+91 ******3210");
    assert.equal(maskPhone("12"), "");
  });
});
