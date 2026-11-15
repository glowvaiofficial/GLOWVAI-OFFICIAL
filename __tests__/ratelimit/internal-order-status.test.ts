// app/api/internal/order-status: dynamic (it reads headers), limited per IP before the HMAC check, and still signed.
// No network: the test sends only statuses that trigger no analytics or email. The secret is test-only.
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { NextRequest } from "next/server";

// Swaps the email queue and the GA4 sender for no-op stubs before the route loads (see order-status-stub-hook.mjs).
register("./order-status-stub-hook.mjs", import.meta.url);

type Route = typeof import("../../app/api/internal/order-status/route");

const FILE = "app/api/internal/order-status/route.ts";
const SECRET = "test-only-internal-webhook-secret-0123456789abcdef";
let route: Route;

before(async () => {
  process.env.INTERNAL_WEBHOOK_SECRET = SECRET;
  route = await import("../../app/api/internal/order-status/route");
});

function post(ip: string, body: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://glowvai.in/api/internal/order-status", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...headers },
  });
}

function signed(ip: string, payload: object) {
  const body = JSON.stringify(payload);
  const ts = String(Date.now());
  const sig = crypto.createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
  return post(ip, body, { "x-signature": sig, "x-timestamp": ts });
}

describe("internal order-status route", () => {
  it("is dynamic, not rendered once at build time", () => {
    const source = readFileSync(new URL(`../../${FILE}`, import.meta.url), "utf8");
    assert.match(source, /export const dynamic = "force-dynamic";/);
    assert.doesNotMatch(source, /force-static/);
  });

  it("checks the per-IP limit before the secret, body and signature", () => {
    const source = readFileSync(new URL(`../../${FILE}`, import.meta.url), "utf8");
    const limitAt = source.search(/rateLimit\(`internal-order-status:\$\{clientIp\(req\)\}`/);
    assert.ok(limitAt > 0, "has a per-IP limit");
    for (const later of ["env.INTERNAL_WEBHOOK_SECRET", "req.text()", 'req.headers.get("x-signature")', "createHmac"]) {
      assert.ok(limitAt < source.indexOf(later), `limit runs before ${later}`);
    }
  });

  it("accepts a correctly signed call", async () => {
    const res = await route.POST(signed("10.70.0.1", { order_ref: "GV-TEST-1", status: "shipped" }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, order_ref: "GV-TEST-1", status: "shipped" });
  });

  it("rejects unsigned and wrongly signed calls", async () => {
    assert.equal((await route.POST(post("10.70.0.2", "{}"))).status, 401);
    const bad = post("10.70.0.2", '{"order_ref":"x","status":"shipped"}', { "x-signature": "00", "x-timestamp": String(Date.now()) });
    assert.equal((await route.POST(bad)).status, 401);
  });

  it("is limited per IP, and one IP's flood does not block another", async () => {
    let last = 0;
    for (let i = 0; i < 61; i++) last = (await route.POST(post("10.70.0.3", "{}"))).status;
    assert.equal(last, 429);
    const other = await route.POST(signed("10.70.0.4", { order_ref: "GV-TEST-2", status: "shipped" }));
    assert.equal(other.status, 200);
  });
});
