import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  parseApplication,
  parseCheckedProductIds,
  parseDecline,
  parseInventory,
  parseServicePincodes,
  parseSince,
  parseTicket,
  productMrp,
} from "../../lib/vendor/validation";

const valid = () => ({
  storeName: "  Glow   Pharmacy ",
  ownerName: "Asha Rao",
  contactNumber: "98765 43210",
  streetAddress: "12 MG Road, Indiranagar",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560038",
  servicePincodes: ["560038", "560008"],
  operatingHours: { openTime: "09:00", closeTime: "21:30", isOpenToday: true },
  categories: ["skincare", "haircare"],
});

function expectError(body: unknown, field: string) {
  const r = parseApplication(body);
  assert.equal(r.ok, false, `expected ${field} to be refused`);
  if (!r.ok) assert.equal(r.field, field);
}

describe("parseApplication", () => {
  test("accepts a minimal valid application and normalises it", () => {
    const r = parseApplication(valid());
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.value.storeName, "Glow Pharmacy");
    assert.equal(r.value.contactNumber, "+919876543210");
    assert.deepEqual(r.value.serviceZoneIds, []);
    assert.deepEqual(r.value.servicePincodes, ["560038", "560008"]);
    // Optional fields are omitted, never undefined (Firestore rejects undefined).
    for (const k of ["gstNumber", "businessRegistrationNumber", "coordinates", "panLast4", "bank"]) assert.ok(!(k in r.value), k);
  });

  test("accepts +91 and 91 prefixes on the mobile number", () => {
    for (const n of ["+91 98765 43210", "919876543210", "9876543210"]) {
      const r = parseApplication({ ...valid(), contactNumber: n });
      assert.ok(r.ok && r.value.contactNumber === "+919876543210", n);
    }
    expectError({ ...valid(), contactNumber: "12345" }, "contactNumber");
    expectError({ ...valid(), contactNumber: "5876543210" }, "contactNumber");
  });

  test("store and owner names are 2-120 characters", () => {
    expectError({ ...valid(), storeName: "A" }, "storeName");
    expectError({ ...valid(), storeName: "x".repeat(121) }, "storeName");
    expectError({ ...valid(), ownerName: 42 }, "ownerName");
    assert.ok(parseApplication({ ...valid(), storeName: "x".repeat(120) }).ok);
  });

  test("GSTIN is optional and checked when present", () => {
    const ok = parseApplication({ ...valid(), gstNumber: "29abcde1234f1z5" });
    assert.ok(ok.ok && ok.value.gstNumber === "29ABCDE1234F1Z5");
    expectError({ ...valid(), gstNumber: "29ABCDE1234F1X5" }, "gstNumber");
    assert.ok(parseApplication({ ...valid(), gstNumber: "" }).ok);
  });

  test("PAN is validated but only the last 4 characters are kept", () => {
    const r = parseApplication({ ...valid(), pan: "abcde1234f" });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.value.panLast4, "234F");
    assert.ok(!JSON.stringify(r.value).includes("ABCDE1234F"));
    expectError({ ...valid(), pan: "ABCD1234F" }, "pan");
  });

  test("bank: IFSC stored masked, full account number refused, UPI checked", () => {
    const bank = { holderName: "Asha Rao", bankName: "HDFC Bank", ifsc: "hdfc0001234", accLast4: "6789", upiVpa: "glow.store@okhdfc" };
    const r = parseApplication({ ...valid(), bank });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(r.value.bank, { holderName: "Asha Rao", bankName: "HDFC Bank", ifsc: "HDFC0••••34", accLast4: "6789", upiVpa: "glow.store@okhdfc" });
    assert.ok(!JSON.stringify(r.value).includes("HDFC0001234"));
    expectError({ ...valid(), bank: { ...bank, accountNumber: "123456786789" } }, "bank");
    expectError({ ...valid(), bank: { ...bank, ifsc: "HDFC1001234" } }, "bank.ifsc");
    expectError({ ...valid(), bank: { ...bank, accLast4: "678" } }, "bank.accLast4");
    expectError({ ...valid(), bank: { ...bank, upiVpa: "no-at-sign" } }, "bank.upiVpa");
  });

  test("pincode and service pincodes", () => {
    expectError({ ...valid(), pincode: "060038" }, "pincode");
    expectError({ ...valid(), servicePincodes: ["56003"] }, "servicePincodes");
    expectError({ ...valid(), servicePincodes: "560038" }, "servicePincodes");
    const r = parseApplication({ ...valid(), servicePincodes: ["560008", "560008"] });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.value.servicePincodes, ["560038", "560008"], "store pincode added, duplicates dropped");
  });

  test("operating hours are HH:mm 24h", () => {
    expectError({ ...valid(), operatingHours: { openTime: "9:00", closeTime: "21:00" } }, "operatingHours");
    expectError({ ...valid(), operatingHours: { openTime: "09:00", closeTime: "24:00" } }, "operatingHours");
    expectError({ ...valid(), operatingHours: { openTime: "09:00", closeTime: "09:00" } }, "operatingHours");
    expectError({ ...valid(), operatingHours: null }, "operatingHours");
    const r = parseApplication({ ...valid(), operatingHours: { openTime: "22:00", closeTime: "06:00" } });
    assert.ok(r.ok && r.value.operatingHours.isOpenToday === true);
  });

  test("categories come from the fixed list, 1 to 7", () => {
    expectError({ ...valid(), categories: [] }, "categories");
    expectError({ ...valid(), categories: ["groceries"] }, "categories");
    const all = ["skincare", "haircare", "makeup", "fragrance", "bath-body", "mens-grooming", "wellness"];
    assert.ok(parseApplication({ ...valid(), categories: all }).ok);
  });

  test("coordinates must be in India when present", () => {
    assert.ok(parseApplication({ ...valid(), coordinates: { latitude: 12.97, longitude: 77.64 } }).ok);
    expectError({ ...valid(), coordinates: { latitude: 51.5, longitude: -0.12 } }, "coordinates");
    expectError({ ...valid(), coordinates: { latitude: "12.9", longitude: "77.6" } }, "coordinates");
  });

  test("ignores status and id fields from the client", () => {
    const r = parseApplication({ ...valid(), status: "APPROVED", applicationId: "VAPP-other", applicantUid: "x" });
    assert.ok(r.ok);
    if (r.ok) for (const k of ["status", "applicationId", "applicantUid"]) assert.ok(!(k in r.value), k);
  });

  test("refuses non-object bodies", () => {
    for (const b of [null, "x", [], 3]) assert.equal(parseApplication(b).ok, false);
  });
});

describe("parseServicePincodes", () => {
  test("caps at 20 including the store pincode", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => String(560001 + i));
    assert.ok(parseServicePincodes(twenty, "560001").ok);
    assert.equal(parseServicePincodes(twenty, "110001").ok, false);
  });
});

describe("order inputs", () => {
  test("decline reasons, note required for OTHER", () => {
    assert.deepEqual(parseDecline({ reason: "store_busy" }), { ok: true, value: { reason: "STORE_BUSY" } });
    assert.equal(parseDecline({ reason: "BORED" }).ok, false);
    assert.equal(parseDecline({ reason: "OTHER" }).ok, false);
    assert.equal(parseDecline({ reason: "OTHER", note: "x".repeat(201) }).ok, false);
    assert.deepEqual(parseDecline({ reason: "OTHER", note: " Power cut " }), { ok: true, value: { reason: "OTHER", note: "Power cut" } });
  });

  test("checkedProductIds", () => {
    assert.deepEqual(parseCheckedProductIds({ checkedProductIds: ["a", "a", "b"] }), { ok: true, value: ["a", "b"] });
    assert.equal(parseCheckedProductIds({ checkedProductIds: [] }).ok, false);
    assert.equal(parseCheckedProductIds({ checkedProductIds: ["../x"] }).ok, false);
    assert.equal(parseCheckedProductIds({}).ok, false);
  });

  test("since", () => {
    assert.deepEqual(parseSince(null), { ok: true, value: 0 });
    assert.deepEqual(parseSince("1762400000000"), { ok: true, value: 1762400000000 });
    assert.equal(parseSince("-1").ok, false);
    assert.equal(parseSince("abc").ok, false);
  });
});

describe("parseInventory", () => {
  test("accepts valid items", () => {
    const r = parseInventory({ items: [{ productId: "p1", stock: 5, isAvailable: true, unitPriceOverride: 199 }, { productId: "p2", stock: 0, isAvailable: false }] });
    assert.ok(r.ok);
    if (r.ok) assert.ok(!("unitPriceOverride" in r.value[1]));
  });

  test("refuses bad items", () => {
    assert.equal(parseInventory({ items: [] }).ok, false);
    assert.equal(parseInventory({ items: Array.from({ length: 101 }, (_, i) => ({ productId: `p${i}`, stock: 1, isAvailable: true })) }).ok, false);
    assert.equal(parseInventory({ items: [{ productId: "p1", stock: 1.5, isAvailable: true }] }).ok, false);
    assert.equal(parseInventory({ items: [{ productId: "p1", stock: 100001, isAvailable: true }] }).ok, false);
    assert.equal(parseInventory({ items: [{ productId: "p1", stock: 1, isAvailable: "yes" }] }).ok, false);
    assert.equal(parseInventory({ items: [{ productId: "p1", stock: 1, isAvailable: true, unitPriceOverride: 0 }] }).ok, false);
    assert.equal(parseInventory({ items: [{ productId: "p1", stock: 1, isAvailable: true }, { productId: "p1", stock: 2, isAvailable: true }] }).ok, false);
  });

  test("MRP from mrp, else worked back from brandPrice and discount", () => {
    assert.equal(productMrp({ mrp: 499, brandPrice: 399 }), 499);
    assert.equal(productMrp({ brandPrice: 400, brandDiscount: 20 }), 500);
    assert.equal(productMrp({ brandPrice: 400 }), 400);
  });
});

describe("parseTicket", () => {
  test("validates category, subject, description, orderId", () => {
    const ok = parseTicket({ category: "payment_issue", subject: "Payout missing", description: "The payout for last week has not arrived." });
    assert.ok(ok.ok && ok.value.category === "PAYMENT_ISSUE" && ok.value.orderId === null);
    assert.equal(parseTicket({ category: "SKIN_ANALYSIS_FAILURE", subject: "abc", description: "x".repeat(20) }).ok, false);
    assert.equal(parseTicket({ category: "ACCOUNT_ISSUE", subject: "ab", description: "x".repeat(20) }).ok, false);
    assert.equal(parseTicket({ category: "ACCOUNT_ISSUE", subject: "abc", description: "short" }).ok, false);
    assert.equal(parseTicket({ category: "ACCOUNT_ISSUE", subject: "abc", description: "x".repeat(20), orderId: "GV/1" }).ok, false);
  });
});
