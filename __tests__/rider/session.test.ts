import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { RIDER_COOKIE_OPTIONS, SESSION_TTL_MS, riderSecret, signRiderSession, verifyRiderSession } from "../../lib/rider/session";

const SECRET = "x".repeat(40);
const OTHER = "y".repeat(40);
const NOW = 1_800_000_000_000;

describe("rider session token", () => {
  test("a fresh token verifies and gives back the partner id and expiry", () => {
    const token = signRiderSession("partner_1", NOW, SECRET);
    assert.deepEqual(verifyRiderSession(token, NOW + 1000, SECRET), { partnerId: "partner_1", expiresAt: NOW + SESSION_TTL_MS });
  });

  test("the token expires after 8 hours", () => {
    const token = signRiderSession("p1", NOW, SECRET);
    assert.ok(verifyRiderSession(token, NOW + 8 * 3600_000 - 1, SECRET));
    assert.equal(verifyRiderSession(token, NOW + 8 * 3600_000, SECRET), null);
    assert.equal(verifyRiderSession(token, NOW + 9 * 3600_000, SECRET), null);
  });

  test("a changed payload fails the signature check", () => {
    const token = signRiderSession("p1", NOW, SECRET);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ v: 1, pid: "admin", iat: NOW, exp: NOW + SESSION_TTL_MS })).toString("base64url");
    assert.equal(verifyRiderSession(`${forged}.${sig}`, NOW, SECRET), null);
    assert.equal(verifyRiderSession(`${payload}x.${sig}`, NOW, SECRET), null);
  });

  test("a changed signature fails, including a signature of the wrong length", () => {
    const token = signRiderSession("p1", NOW, SECRET);
    const [payload, sig] = token.split(".");
    const flipped = sig.slice(0, -2) + (sig.slice(-2) === "AA" ? "BB" : "AA");
    assert.equal(verifyRiderSession(`${payload}.${flipped}`, NOW, SECRET), null);
    assert.equal(verifyRiderSession(`${payload}.${sig.slice(0, 10)}`, NOW, SECRET), null);
    assert.equal(verifyRiderSession(`${payload}.`, NOW, SECRET), null);
  });

  test("a token signed with another secret is refused", () => {
    const token = signRiderSession("p1", NOW, OTHER);
    assert.equal(verifyRiderSession(token, NOW, SECRET), null);
  });

  test("malformed tokens are refused", () => {
    assert.equal(verifyRiderSession(undefined, NOW, SECRET), null);
    assert.equal(verifyRiderSession("", NOW, SECRET), null);
    assert.equal(verifyRiderSession("no-dot-here", NOW, SECRET), null);
    assert.equal(verifyRiderSession("a.b.c", NOW, SECRET), null);
    assert.equal(verifyRiderSession("a".repeat(2000), NOW, SECRET), null);
  });

  test("a token dated well in the future is refused", () => {
    const token = signRiderSession("p1", NOW + 10 * 60_000, SECRET);
    assert.equal(verifyRiderSession(token, NOW, SECRET), null);
  });

  test("partner ids outside the allowed shape cannot be signed", () => {
    assert.throws(() => signRiderSession("../etc", NOW, SECRET));
    assert.throws(() => signRiderSession("", NOW, SECRET));
  });

  test("the rider routes refuse to run without a secret of at least 32 characters", () => {
    assert.throws(() => riderSecret({}), (err: Error & { status?: number }) => err.status === 503);
    assert.throws(() => riderSecret({ RIDER_SESSION_SECRET: "short" }));
    assert.equal(riderSecret({ RIDER_SESSION_SECRET: SECRET }), SECRET);
  });

  test("the cookie is HttpOnly, Secure, SameSite=Strict and lasts 8 hours", () => {
    assert.equal(RIDER_COOKIE_OPTIONS.httpOnly, true);
    assert.equal(RIDER_COOKIE_OPTIONS.secure, true);
    assert.equal(RIDER_COOKIE_OPTIONS.sameSite, "strict");
    assert.equal(RIDER_COOKIE_OPTIONS.maxAge, 28800);
  });
});
