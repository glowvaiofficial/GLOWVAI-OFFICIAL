import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateOffer, normalizeCode, offerSentence, readOffer, type Offer, type OfferLine } from "@/lib/shop/offers";

const NOW = 1_800_000_000_000;
const base = (over: Partial<Offer> = {}): Offer => ({
  id: "o1", code: "GLOW20", automatic: false, name: "Glow 20", type: "percent", value: 20, maxDiscount: 200, minSubtotal: 699,
  category: null, startsAt: null, endsAt: null, enabled: true, perCustomerLimit: 1, totalLimit: null, ...over,
});
const lines = (total: number, category = "Serums"): OfferLine[] => [{ productId: "p1", category, total }];
const none = { total: 0, forCustomer: 0 };

test("codes are uppercased and must be 3 to 20 letters, digits, _ or -", () => {
  assert.equal(normalizeCode(" glow20 "), "GLOW20");
  assert.equal(normalizeCode("a"), null);
  assert.equal(normalizeCode("bad code!"), null);
});

test("percent offers take the percentage, capped at the maximum", () => {
  const r = evaluateOffer(base(), lines(2000), NOW, none);
  assert.deepEqual([r.ok, r.ok && r.discount], [true, 200]);
  const small = evaluateOffer(base(), lines(800), NOW, none);
  assert.equal(small.ok && small.discount, 160);
});

test("flat offers take the rupee value, never more than the eligible total", () => {
  const r = evaluateOffer(base({ type: "flat", value: 500, maxDiscount: null, minSubtotal: 0 }), lines(300), NOW, none);
  assert.equal(r.ok && r.discount, 300);
});

test("the minimum is checked on the eligible items", () => {
  const r = evaluateOffer(base(), lines(500), NOW, none);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /Add ₹199 more/);
});

test("a category offer ignores products outside that category", () => {
  const r = evaluateOffer(base({ category: "Serums", minSubtotal: 0 }), [{ productId: "a", category: "Serums", total: 100 }, { productId: "b", category: "Makeup", total: 900 }], NOW, none);
  assert.equal(r.ok && r.discount, 20);
});

test("off, not started, ended, used up and per-customer limits are refused", () => {
  assert.equal(evaluateOffer(base({ enabled: false }), lines(2000), NOW, none).ok, false);
  assert.equal(evaluateOffer(base({ startsAt: NOW + 1 }), lines(2000), NOW, none).ok, false);
  assert.equal(evaluateOffer(base({ endsAt: NOW }), lines(2000), NOW, none).ok, false);
  assert.equal(evaluateOffer(base({ totalLimit: 5 }), lines(2000), NOW, { total: 5, forCustomer: 0 }).ok, false);
  assert.equal(evaluateOffer(base(), lines(2000), NOW, { total: 0, forCustomer: 1 }).ok, false);
});

test("the customer sentence reads in plain words", () => {
  assert.equal(offerSentence(base({ category: "Serums" })), "20% off, up to ₹200 on serums on orders above ₹699.");
});

test("stored offers are read strictly", () => {
  assert.ok(readOffer("o1", { code: "GLOW20", name: "x", type: "percent", value: 20, maxDiscount: 200, minSubtotal: 0, category: null, enabled: true }));
  assert.equal(readOffer("o1", { code: "GLOW20", name: "x", type: "percent", value: 80, maxDiscount: 200, minSubtotal: 0, category: null, enabled: true }), null);
  assert.equal(readOffer("o1", { code: "GLOW20", name: "x", type: "flat", value: 50, maxDiscount: 10, minSubtotal: 0, category: null, enabled: true }), null);
  assert.equal(readOffer("o1", { code: "GLOW20", name: "x", type: "flat", value: 50, minSubtotal: 0, category: null, enabled: true, startsAt: 5, endsAt: 4 }), null);
});

import { chooseBest, type BagCandidate } from "@/lib/shop/offers";

const cand = (source: BagCandidate["source"], discount: number): BagCandidate => ({ source, code: source === "auto" ? null : "X", offerId: source === "auto" ? "a" : null, discount, label: "" });

test("the largest discount wins across built-in, typed and automatic offers", () => {
  assert.equal(chooseBest([cand("builtin", 50), cand("auto", 120), cand("code", 80)])?.source, "auto");
  assert.equal(chooseBest([cand("builtin", 50), cand("code", 80)])?.source, "code");
});

test("a tie goes to the code the customer chose, not to an automatic offer", () => {
  assert.equal(chooseBest([cand("auto", 60), cand("code", 60)])?.source, "code");
});

test("no positive discount means no offer", () => {
  assert.equal(chooseBest([cand("auto", 0)]), null);
  assert.equal(chooseBest([]), null);
});

test("an automatic offer needs no code, and a code offer needs one", () => {
  assert.ok(readOffer("a1", { automatic: true, name: "Cart deal", type: "flat", value: 100, minSubtotal: 500, category: null, enabled: true }));
  assert.equal(readOffer("a1", { automatic: true, code: "SHOULDNOT", name: "Cart deal", type: "flat", value: 100, minSubtotal: 500, category: null, enabled: true }), null);
  assert.equal(readOffer("c1", { automatic: false, name: "Typed", type: "flat", value: 100, minSubtotal: 0, category: null, enabled: true }), null);
});
