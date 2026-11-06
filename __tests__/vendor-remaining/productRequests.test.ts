import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_REQUEST_CAP,
  MAX_PICTURES,
  dailyRequestAllowed,
  istDayKey,
  normaliseStatus,
  parseProductRequest,
  pictureUrlAllowed,
  toRequestView,
} from "../../lib/vendor/productRequests";

const good = (extra: Record<string, unknown> = {}) => ({
  name: "  Vitamin C   Serum ",
  brand: "Glow Labs",
  category: "skincare",
  mrp: 499,
  reason: "Customers ask for this serum every week and we stock it.",
  ...extra,
});

describe("product request validation", () => {
  test("a complete request parses, with the name tidied", () => {
    const r = parseProductRequest(good({ barcode: "8901234567890", pictureUrls: ["https://images.unsplash.com/photo-1"] }));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.name, "Vitamin C Serum");
    assert.equal(r.value.barcode, "8901234567890");
    assert.deepEqual(r.value.pictureUrls, ["https://images.unsplash.com/photo-1"]);
  });

  test("barcode and pictures are optional", () => {
    const r = parseProductRequest(good({ barcode: "", pictureUrls: [] }));
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.barcode, null);
      assert.deepEqual(r.value.pictureUrls, []);
    }
  });

  test("name, brand, category, MRP and reason are checked with a field name", () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ name: "A" }, "name"],
      [{ brand: "" }, "brand"],
      [{ category: "electronics" }, "category"],
      [{ mrp: 0 }, "mrp"],
      [{ mrp: 12.5 }, "mrp"],
      [{ mrp: "499" }, "mrp"],
      [{ mrp: 1_000_001 }, "mrp"],
      [{ reason: "too short" }, "reason"],
    ];
    for (const [patch, field] of cases) {
      const r = parseProductRequest(good(patch));
      assert.equal(r.ok, false, JSON.stringify(patch));
      if (!r.ok) assert.equal(r.field, field);
    }
  });

  test("a barcode must be 8 to 14 digits", () => {
    for (const bad of ["1234567", "123456789012345", "12345abc", "1234 5678"]) {
      const r = parseProductRequest(good({ barcode: bad }));
      assert.equal(r.ok, false, bad);
      if (!r.ok) assert.equal(r.field, "barcode");
    }
  });

  test("no more than three pictures", () => {
    assert.equal(MAX_PICTURES, 3);
    const four = ["a", "b", "c", "d"].map((x) => `https://images.unsplash.com/${x}`);
    const r = parseProductRequest(good({ pictureUrls: four }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.field, "pictureUrls");
  });

  test("duplicate picture links collapse to one", () => {
    const u = "https://images.unsplash.com/x";
    const r = parseProductRequest(good({ pictureUrls: [u, u] }));
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.pictureUrls, [u]);
  });
});

describe("picture host allow-list", () => {
  test("the allowed hosts over https pass", () => {
    assert.equal(pictureUrlAllowed("https://images.unsplash.com/photo-1"), true);
    assert.equal(pictureUrlAllowed("https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg"), true);
    assert.equal(pictureUrlAllowed("https://storage.googleapis.com/bucket/a.png"), true);
  });

  test("other hosts, look-alike hosts and plain http are refused", () => {
    for (const bad of [
      "https://evil.example.com/a.jpg",
      "https://images.unsplash.com.evil.example.com/a.jpg",
      "https://evilimages.unsplash.com/a.jpg",
      "https://storage.googleapis.com.attacker.net/a.jpg",
      "http://images.unsplash.com/a.jpg",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "not a url",
    ]) {
      assert.equal(pictureUrlAllowed(bad), false, bad);
    }
  });

  test("credentials, a non-default port and over-long links are refused", () => {
    assert.equal(pictureUrlAllowed("https://user:pw@images.unsplash.com/a.jpg"), false);
    assert.equal(pictureUrlAllowed("https://images.unsplash.com:8443/a.jpg"), false);
    assert.equal(pictureUrlAllowed(`https://images.unsplash.com/${"a".repeat(600)}`), false);
  });
});

describe("request status and the vendor's view", () => {
  test("the status enum the admin team reads is PENDING, APPROVED, REJECTED, NEEDS_INFO", () => {
    assert.equal(normaliseStatus("PENDING"), "PENDING");
    assert.equal(normaliseStatus("approved"), "APPROVED");
    assert.equal(normaliseStatus("REJECTED"), "REJECTED");
    assert.equal(normaliseStatus("NEEDS_INFO"), "NEEDS_INFO");
    assert.equal(normaliseStatus("SOMETHING_ELSE"), "PENDING");
    assert.equal(normaliseStatus(undefined), "PENDING");
  });

  test("the view is an allow-list: internal fields never leave the server", () => {
    const view = toRequestView("PR-1", {
      id: "PR-1",
      vendorUid: "uid-secret",
      vendorApplicationId: "VAPP-uid-secret",
      dayKey: "2026-11-07",
      name: "Serum",
      brand: "Glow",
      category: "skincare",
      mrp: 499,
      barcode: null,
      pictureUrls: [],
      reason: "A long enough reason",
      status: "APPROVED",
      staffNote: "Approved. Call 9876543210 or write ops@example.com",
      createdAt: 1,
      updatedAt: 2,
    });
    assert.deepEqual(Object.keys(view).sort(), [
      "barcode",
      "brand",
      "category",
      "createdAt",
      "id",
      "mrp",
      "name",
      "pictureUrls",
      "reason",
      "staffNote",
      "status",
      "updatedAt",
    ]);
    assert.ok(!view.staffNote?.includes("9876543210"));
    assert.ok(!view.staffNote?.includes("ops@example.com"));
  });

  test("a request with no staff note shows null, not an empty string", () => {
    assert.equal(toRequestView("PR-2", { name: "X", status: "PENDING" }).staffNote, null);
  });
});

describe("daily cap", () => {
  test("five requests per IST day, the sixth is refused", () => {
    assert.equal(DAILY_REQUEST_CAP, 5);
    assert.equal(dailyRequestAllowed(0), true);
    assert.equal(dailyRequestAllowed(4), true);
    assert.equal(dailyRequestAllowed(5), false);
  });

  test("the day changes at IST midnight, not UTC midnight", () => {
    // 2026-11-06T18:29:59Z is 23:59:59 IST on 6 Nov; one second later it is 7 Nov IST.
    assert.equal(istDayKey(Date.parse("2026-11-06T18:29:59Z")), "2026-11-06");
    assert.equal(istDayKey(Date.parse("2026-11-06T18:30:00Z")), "2026-11-07");
  });
});
