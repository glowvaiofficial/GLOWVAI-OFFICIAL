// One route per class, through the real route handlers: an anonymous session gets 401 PHONE_REQUIRED, a phone user gets
// past the check (and then meets the route's own validation). The Firebase verifier is a stub (firebase-stub-hook.mjs).
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { NextRequest } from "next/server";

register("./firebase-stub-hook.mjs", import.meta.url);

type Handler = (req: NextRequest) => Promise<Response>;
const handlers: Record<string, Handler> = {};
const PHONE = "+919876543210";
const ANON = "anon-token";
const REAL = "phone-token";

let ipCounter = 0;
const call = (name: string, token: string | null, body: string) =>
  handlers[name](new NextRequest(`https://glowvai.in/api/shop/${name}`, {
    method: "POST",
    body,
    headers: { "content-type": "application/json", "x-forwarded-for": `10.9.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
  }));

before(async () => {
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: "test", client_email: "t@test.iam", private_key: "x" });
  (globalThis as Record<string, unknown>).__fakeVerifyIdToken = async (token: string) => {
    if (token === ANON) return { uid: "anon-1", firebase: { sign_in_provider: "anonymous" } };
    if (token === REAL) return { uid: "phone-1", phone_number: PHONE, firebase: { sign_in_provider: "phone" } };
    throw new Error("invalid");
  };
  handlers.orders = (await import("../../app/api/shop/orders/route")).POST as Handler;
  handlers.profile = (await import("../../app/api/shop/profile/route")).POST as Handler;
  handlers.returns = (await import("../../app/api/shop/returns/route")).POST as Handler;
  handlers["referral/apply"] = (await import("../../app/api/shop/referral/apply/route")).POST as Handler;
});

const classes: [string, string][] = [
  ["orders", "order creation"],
  ["profile", "address and profile writes"],
  ["returns", "returns"],
  ["referral/apply", "wallet, coins and referral claims"],
];

for (const [name, label] of classes) {
  describe(`POST /api/shop/${name} (${label})`, () => {
    it("refuses an anonymous session with 401 PHONE_REQUIRED", async () => {
      const res = await call(name, ANON, "null");
      assert.equal(res.status, 401);
      assert.equal((await res.json()).code, "PHONE_REQUIRED");
    });

    it("refuses a missing token before anything else", async () => {
      const res = await call(name, null, "null");
      assert.equal(res.status, 401);
      assert.equal((await res.json()).code, "SIGN_IN_REQUIRED");
    });

    it("lets a phone user through to the route's own validation", async () => {
      const res = await call(name, REAL, "null");
      assert.notEqual(res.status, 401);
      assert.equal(res.status, 400);
    });
  });
}
