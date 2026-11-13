import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACCOUNT_LIMITS,
  accountRecord,
  bodyPhoneMatches,
  phoneAccountClaims,
  phoneChangeAllowed,
  planAccountWrite,
} from "../../lib/shop/account/rules";

const root = join(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(join(root, file), "utf8").replace(/\r\n/g, "\n");
const PHONE = "+919876543210";
const NOW = 1_800_000_000_000;

describe("the account record: the fields the admin Customers list reads", () => {
  test("has exactly the fields the shop writes at sign-up", () => {
    const record = accountRecord("uid-1", PHONE, NOW);
    assert.deepEqual(Object.keys(record).sort(), [
      "consentTimestamp",
      "consents",
      "createdAt",
      "lastActiveAt",
      "onboardingCompleted",
      "phone",
      "phoneVerified",
      "role",
      "source",
      "uid",
    ]);
    assert.deepEqual(record, {
      uid: "uid-1",
      phone: PHONE,
      phoneVerified: true,
      source: "web_shop",
      createdAt: NOW,
      lastActiveAt: NOW,
      role: "customer",
      onboardingCompleted: false,
      consents: { marketing: false, analytics: false },
      consentTimestamp: NOW,
    });
  });

  test("the phone is E.164 and verified; no name, email or address is needed or written", () => {
    const record = accountRecord("uid-1", PHONE, NOW) as unknown as Record<string, unknown>;
    assert.match(String(record.phone), /^\+91[6-9]\d{9}$/);
    assert.equal(record.phoneVerified, true);
    for (const absent of ["name", "email", "address", "displayName", "city", "language"]) {
      assert.equal(absent in record, false, `${absent} must not be written at sign-up`);
    }
  });

  test("the admin adapter's reads (sourceAdapters.ts adaptShopUser) find what the record holds", () => {
    // adaptShopUser reads: name|displayName, phone|phoneNumber, phoneVerified, onboardingCompleted (hasSkinProfile),
    // createdAt (joinedAt), lastActiveAt, consents.marketing, consents.analytics, consentTimestamp.
    const record = accountRecord("uid-1", PHONE, NOW) as unknown as Record<string, unknown>;
    assert.equal(record.phone, PHONE);
    assert.equal(record.phoneVerified, true);
    assert.equal(record.onboardingCompleted, false);
    assert.equal(record.createdAt, NOW);
    assert.equal(record.lastActiveAt, NOW);
    assert.equal((record.consents as { marketing: boolean }).marketing, false);
    assert.equal((record.consents as { analytics: boolean }).analytics, false);
    assert.equal(record.consentTimestamp, NOW);
  });
});

describe("idempotent create: an existing account is never overwritten", () => {
  test("a new uid gets a full record", () => {
    const plan = planAccountWrite(undefined, "uid-1", PHONE, NOW);
    assert.equal(plan.kind, "create");
    if (plan.kind === "create") assert.equal(plan.record.phone, PHONE);
  });

  test("an existing account only has its lastActiveAt moved", () => {
    const existing = { uid: "uid-1", phone: PHONE, name: "Asha", email: "a@example.com", phoneVerified: true };
    const plan = planAccountWrite(existing, "uid-1", "+919123456789", NOW + 5000);
    assert.deepEqual(plan, { kind: "existing", update: { lastActiveAt: NOW + 5000 } });
  });

  test("calling again with the same account gives the same result (no second full write)", () => {
    const existing = { uid: "uid-1", phone: PHONE };
    const first = planAccountWrite(existing, "uid-1", PHONE, NOW);
    const second = planAccountWrite(existing, "uid-1", PHONE, NOW + 1);
    assert.equal(first.kind, "existing");
    assert.equal(second.kind, "existing");
    assert.equal("record" in first, false);
  });
});

describe("the ID token: only a phone-provider token creates an account", () => {
  const phoneToken = {
    uid: "uid-1",
    firebase: { sign_in_provider: "phone" },
    phone_number: PHONE,
  };

  test("a phone token gives the uid and the E.164 number from the claims", () => {
    assert.deepEqual(phoneAccountClaims(phoneToken), { ok: true, uid: "uid-1", phone: PHONE });
  });

  test("anonymous, password and other providers are refused", () => {
    for (const provider of ["anonymous", "password", "google.com", undefined]) {
      const result = phoneAccountClaims({ ...phoneToken, firebase: { sign_in_provider: provider } });
      assert.equal(result.ok, false, `provider ${provider}`);
      if (!result.ok) assert.equal(result.status, 403);
    }
    assert.equal(phoneAccountClaims({ uid: "uid-1", phone_number: PHONE }).ok, false);
  });

  test("a phone claim that is not an Indian mobile in E.164 is refused", () => {
    for (const phone_number of ["+447911123456", "9876543210", "+91 98765 43210", "+919123", undefined]) {
      const result = phoneAccountClaims({ ...phoneToken, phone_number });
      assert.equal(result.ok, false, `claim ${phone_number}`);
    }
  });

  test("a missing or oversized uid is refused", () => {
    assert.equal(phoneAccountClaims({ ...phoneToken, uid: "" }).ok, false);
    assert.equal(phoneAccountClaims({ ...phoneToken, uid: "x".repeat(129) }).ok, false);
    assert.equal(phoneAccountClaims({ ...phoneToken, uid: 42 }).ok, false);
  });
});

describe("rate limits for the create route", () => {
  test("10 per hour per IP and 5 per hour per uid", () => {
    assert.equal(ACCOUNT_LIMITS.perIpPerHour, 10);
    assert.equal(ACCOUNT_LIMITS.perUidPerHour, 5);
    assert.equal(ACCOUNT_LIMITS.windowMs, 60 * 60 * 1000);
  });

  test("the route applies both limits through the shared limiter", () => {
    const source = read("app/api/shop/account/create/route.ts");
    assert.match(source, /limitByIpShared\(req, "account-create", 10, HOUR/);
    assert.match(source, /limitByUserShared\(checked\.uid, "account-create", 5, HOUR/);
  });

  test("the IP limit is checked before the token is verified", () => {
    const source = read("app/api/shop/account/create/route.ts");
    assert.ok(source.indexOf("limitByIpShared(req, \"account-create\"") < source.indexOf("verifyIdToken"));
  });
});

describe("the create route: server checks and the write", () => {
  test("verifies the token, checks the provider and writes only the planned record", () => {
    const source = read("app/api/shop/account/create/route.ts");
    assert.match(source, /adminAuth\(\)\.verifyIdToken\(token\)/);
    assert.match(source, /phoneAccountClaims\(claims\)/);
    assert.match(source, /planAccountWrite\(/);
    assert.match(source, /tx\.set\(ref, plan\.record\)/);
    assert.match(source, /tx\.update\(ref, plan\.update\)/);
    // The uid comes from the verified token only, never from the request body.
    // A body phone is checked against the token; the uid never comes from the body.
    assert.doesNotMatch(source, /body\.uid|uid\s*=\s*body|searchParams/);
    assert.match(source, /bodyPhoneMatches\(body, checked\.phone\)/);
    assert.match(source, /return json\(\{ ok: true, account: \{ uid: checked\.uid, phoneVerified: true \} \}\);/);
  });
});

describe("the profile route never clears a verified phone", () => {
  test("a verified number cannot be changed by a profile save", () => {
    assert.equal(phoneChangeAllowed(true, PHONE, "+919123456789"), false);
    assert.equal(phoneChangeAllowed(true, PHONE, PHONE), true);
  });

  test("an unverified number may change through the profile", () => {
    assert.equal(phoneChangeAllowed(false, PHONE, "+919123456789"), true);
  });

  test("the profile route no longer writes phoneVerified: false", () => {
    const source = read("app/api/shop/profile/route.ts");
    assert.doesNotMatch(source, /phoneVerified: false/);
    assert.match(source, /phoneVerified: d\.phoneVerified === true/);
    assert.match(source, /phoneChangeAllowed\(/);
  });

  test("the optimistic profile update keeps the verified state", () => {
    assert.match(read("glowvai-app/core/state/customerStore.ts"), /phoneVerified: previous\?\.phoneVerified \?\? false/);
  });
});

describe("a body phone must match the verified token", () => {
  test("no body, or a body without a phone, is fine: the token decides", () => {
    assert.equal(bodyPhoneMatches(null, PHONE), true);
    assert.equal(bodyPhoneMatches({}, PHONE), true);
  });

  test("a body phone that is the token's number, in any usual form, is fine", () => {
    assert.equal(bodyPhoneMatches({ phone: "+919876543210" }, PHONE), true);
    assert.equal(bodyPhoneMatches({ phone: "98765 43210" }, PHONE), true);
  });

  test("a body phone that differs from the token is refused", () => {
    assert.equal(bodyPhoneMatches({ phone: "+919123456789" }, PHONE), false);
    assert.equal(bodyPhoneMatches({ phone: "garbage" }, PHONE), false);
    assert.equal(bodyPhoneMatches({ phone: null }, PHONE), false);
  });
});
