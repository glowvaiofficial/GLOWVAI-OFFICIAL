// lib/auth/requirePhoneUser.ts: anonymous sessions are refused with 401 PHONE_REQUIRED; phone accounts pass.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { requirePhoneUser, type PhoneUserDeps, type VerifiedToken } from "../../lib/auth/requirePhoneUser";

const PHONE = "+919876543210";
const req = (token?: string) =>
  new NextRequest("https://glowvai.in/api/shop/orders", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {} });
const deps = (claims: VerifiedToken | Error, stored: string | null = null): PhoneUserDeps => ({
  verifyIdToken: async () => { if (claims instanceof Error) throw claims; return claims; },
  verifiedPhoneOf: async () => stored,
});
const bodyOf = async (r: { ok: false; response: Response }) => ({ status: r.response.status, body: await r.response.json() });

describe("requirePhoneUser", () => {
  it("refuses a request with no token as SIGN_IN_REQUIRED", async () => {
    const r = await requirePhoneUser(req(), deps({ uid: "u" }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(await bodyOf(r), { status: 401, body: { ok: false, code: "SIGN_IN_REQUIRED", error: "Sign in again to continue." } });
  });

  it("refuses a bad or expired token as SIGN_IN_REQUIRED", async () => {
    const r = await requirePhoneUser(req("bad"), deps(new Error("expired")));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal((await bodyOf(r)).body.code, "SIGN_IN_REQUIRED");
  });

  it("refuses an anonymous session with 401 PHONE_REQUIRED, even if a record claims a verified phone", async () => {
    const r = await requirePhoneUser(req("t"), deps({ uid: "anon", firebase: { sign_in_provider: "anonymous" } }, PHONE));
    assert.equal(r.ok, false);
    if (!r.ok) {
      const { status, body } = await bodyOf(r);
      assert.equal(status, 401);
      assert.equal(body.code, "PHONE_REQUIRED");
      assert.equal(body.ok, false);
    }
  });

  it("allows a phone-provider token and takes the phone from the token", async () => {
    const r = await requirePhoneUser(req("t"), deps({ uid: "u1", phone_number: PHONE, firebase: { sign_in_provider: "phone" } }));
    assert.deepEqual(r.ok && r.user, { uid: "u1", phone: PHONE, anonymous: false });
  });

  it("refuses a phone token with no usable phone_number claim", async () => {
    const r = await requirePhoneUser(req("t"), deps({ uid: "u1", firebase: { sign_in_provider: "phone" } }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal((await bodyOf(r)).body.code, "PHONE_REQUIRED");
  });

  it("allows a custom-token user whose server record has a verified phone", async () => {
    const r = await requirePhoneUser(req("t"), deps({ uid: "c1", firebase: { sign_in_provider: "custom" } }, PHONE));
    assert.deepEqual(r.ok && r.user, { uid: "c1", phone: PHONE, anonymous: false });
  });

  it("refuses a custom-token user with no verified phone on record, or when the record cannot be read", async () => {
    const none = await requirePhoneUser(req("t"), deps({ uid: "c1", firebase: { sign_in_provider: "custom" } }, null));
    assert.equal(none.ok, false);
    const broken: PhoneUserDeps = { verifyIdToken: async () => ({ uid: "c1", firebase: { sign_in_provider: "custom" } }), verifiedPhoneOf: async () => { throw new Error("down"); } };
    assert.equal((await requirePhoneUser(req("t"), broken)).ok, false);
  });
});
