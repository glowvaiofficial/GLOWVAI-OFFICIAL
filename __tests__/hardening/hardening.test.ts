// 19 Nov 2026 hardening: CDN cache headers on public reads, the daily email cap, shared limiter on verify routes.
// Source-text checks for the routes (no Firebase) and a fake store for the email cap.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dailyCap, streamLimit, takeEmailSlot, type CapStore } from "../../lib/email/dailyCap";

const route = (p: string) => readFileSync(join(process.cwd(), "app", "api", ...p.split("/"), "route.ts"), "utf8");

describe("CDN cache on public reads", () => {
  for (const p of ["shop/config", "shop/ratings", "shop/products/[id]/reviews", "shop/products/[id]/questions"]) {
    it(`${p} GET uses jsonPublic`, () => {
      const src = route(p);
      const get = src.slice(src.indexOf("export async function GET"), src.indexOf("export async function POST") > 0 ? src.indexOf("export async function POST") : undefined);
      assert.match(get, /jsonPublic\(/);
      assert.doesNotMatch(get, /customerFrom/);
    });
  }
  it("per-user routes never use jsonPublic", () => {
    for (const p of ["shop/reorder-items", "shop/orders", "shop/reviews", "shop/wallet/topup", "shop/payments/razorpay/verify"]) {
      assert.doesNotMatch(route(p), /jsonPublic/, p);
    }
  });
  it("the helper sets a public s-maxage header", () => {
    const src = readFileSync(join(process.cwd(), "lib", "shop", "server.ts"), "utf8");
    assert.match(src, /public, max-age=0, s-maxage=\$\{sMaxAge\}, stale-while-revalidate=/);
  });
});

describe("verify routes use the shared limiter with the same numbers", () => {
  it("razorpay verify", () => {
    const s = route("shop/payments/razorpay/verify");
    assert.match(s, /await limitByIpShared\(req, "razorpay-verify-post", 30\)/);
    assert.match(s, /await limitByUserShared\(customer\.uid, "razorpay-verify", 60\)/);
  });
  it("wallet top-up verify", () => {
    const s = route("shop/wallet/topup/verify");
    assert.match(s, /await limitByIpShared\(req, "wallet-topup-verify", TOPUP_LIMITS\.verifyPerIpPerHour, HOUR\)/);
    assert.match(s, /await limitByUserShared\(customer\.uid, "wallet-topup-verify", TOPUP_LIMITS\.verifyPerCustomerPerHour, HOUR\)/);
  });
});

describe("daily email cap", () => {
  const fake = () => {
    let count = 0;
    const store: CapStore = { async take(_id, limit) { if (count >= limit) return false; count++; return true; } };
    return { store, get count() { return count; } };
  };
  it("defaults to 80 and reads the env value", () => {
    assert.equal(dailyCap(undefined), 80);
    assert.equal(dailyCap("abc"), 80);
    assert.equal(dailyCap("50"), 50);
  });
  it("marketing stops 20 before transactional", async () => {
    const f = fake();
    for (let i = 0; i < 60; i++) assert.equal(await takeEmailSlot("marketing", { store: f.store, cap: 80 }), true);
    assert.equal(await takeEmailSlot("marketing", { store: f.store, cap: 80 }), false);
    assert.equal(streamLimit("transactional", 80), 80);
    for (let i = 0; i < 20; i++) assert.equal(await takeEmailSlot("transactional", { store: f.store, cap: 80 }), true);
    assert.equal(await takeEmailSlot("transactional", { store: f.store, cap: 80 }), false);
    assert.equal(f.count, 80);
  });
  it("fails soft: store errors never throw, orders still send, marketing is held", async () => {
    const bad: CapStore = { async take() { throw new Error("down"); } };
    assert.equal(await takeEmailSlot("transactional", { store: bad }), true);
    assert.equal(await takeEmailSlot("marketing", { store: bad }), false);
  });
  it("send.ts takes a slot before sending", () => {
    const s = readFileSync(join(process.cwd(), "lib", "email", "send.ts"), "utf8");
    assert.ok(s.indexOf("takeEmailSlot(stream)") > 0 && s.indexOf("takeEmailSlot(stream)") < s.indexOf("sendViaResendApi({"));
  });
});
