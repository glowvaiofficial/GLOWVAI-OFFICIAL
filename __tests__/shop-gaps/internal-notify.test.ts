import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { internalSecret, signInternalRequest, verifyInternalRequest, MAX_CLOCK_SKEW_MS } from "../../lib/shop/refunds";
import { INTERNAL_NOTIFY_MAX_BODY, notifyClaimId, notifyOnce, parseInternalNotify, type ClaimStore } from "../../lib/shop/internalNotify";
import { notifyCustomerWith, type NotifyDeps, type NotifyResult } from "../../lib/shop/notifications/dispatch";
import { DEFAULT_PREFS } from "../../lib/shop/notifications/policy";
import type { RenderedNotification } from "../../lib/shop/notifications/templates";

const SECRET = "n".repeat(40);
const NOW = 1_762_400_000_000;
const UID = "cust_uid_0001";
const BODY = JSON.stringify({ uid: UID, type: "order_delivered", relatedId: "GV-261106-ABC123" });
const sigFor = (ts: string, raw: string, secret = SECRET) => signInternalRequest(secret, ts, raw);
const ts = String(NOW);

describe("signed server-to-server calls (same scheme as refunds)", () => {
  test("a correctly signed body inside the window is accepted", () => {
    const res = verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sigFor(ts, BODY), rawBody: BODY, now: NOW });
    assert.deepEqual(res, { ok: true });
  });

  test("a signature made with the wrong secret is refused", () => {
    const res = verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sigFor(ts, BODY, "x".repeat(40)), rawBody: BODY, now: NOW });
    assert.deepEqual(res, { ok: false, reason: "BAD_SIGNATURE" });
  });

  test("a timestamp more than 5 minutes old is refused as stale, also when it is in the future", () => {
    const old = String(NOW - MAX_CLOCK_SKEW_MS - 1);
    const future = String(NOW + MAX_CLOCK_SKEW_MS + 1);
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: old, signature: sigFor(old, BODY), rawBody: BODY, now: NOW }), { ok: false, reason: "STALE" });
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: future, signature: sigFor(future, BODY), rawBody: BODY, now: NOW }), { ok: false, reason: "STALE" });
  });

  test("a changed body fails the signature check", () => {
    const tampered = BODY.replace("order_delivered", "order_cancelled");
    const res = verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: sigFor(ts, BODY), rawBody: tampered, now: NOW });
    assert.deepEqual(res, { ok: false, reason: "BAD_SIGNATURE" });
  });

  test("a missing signature or timestamp is refused", () => {
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: null, signature: sigFor(ts, BODY), rawBody: BODY, now: NOW }), { ok: false, reason: "MISSING" });
    assert.deepEqual(verifyInternalRequest({ secret: SECRET, timestamp: ts, signature: null, rawBody: BODY, now: NOW }), { ok: false, reason: "MISSING" });
  });

  test("the route answers 503 when the secret is missing or too short", () => {
    assert.equal(internalSecret({}), null);
    assert.equal(internalSecret({ INTERNAL_API_SECRET: "short" }), null);
    assert.equal(internalSecret({ INTERNAL_API_SECRET: SECRET }), SECRET);
  });
});

describe("notify body", () => {
  test("accepts a known type with a plain related id, and with none", () => {
    const withId = parseInternalNotify({ uid: UID, type: "order_delivered", relatedId: "GV-1" });
    assert.deepEqual(withId, { ok: true, value: { uid: UID, type: "order_delivered", relatedId: "GV-1" } });
    const bare = parseInternalNotify({ uid: UID, type: "coins_credited" });
    assert.deepEqual(bare, { ok: true, value: { uid: UID, type: "coins_credited", relatedId: null } });
  });

  test("refuses an unknown type, a bad uid, or a related id that is not a plain id", () => {
    assert.equal(parseInternalNotify({ uid: UID, type: "made_up_event" }).ok, false);
    assert.equal(parseInternalNotify({ uid: "x", type: "order_placed" }).ok, false);
    assert.equal(parseInternalNotify({ uid: UID, type: "order_placed", relatedId: "has spaces and text" }).ok, false);
    assert.equal(parseInternalNotify(null).ok, false);
  });

  test("the body cap is 4 KB", () => {
    assert.equal(INTERNAL_NOTIFY_MAX_BODY, 4096);
  });
});

// In-memory claim store with the same semantics as the Firestore create()-based claim.
function claimStore() {
  const held = new Set<string>();
  const store: ClaimStore & { held: Set<string> } = {
    held,
    async claim(uid, id) {
      const key = `${uid}/${id}`;
      if (held.has(key)) return false;
      held.add(key);
      return true;
    },
    async release(uid, id) {
      held.delete(`${uid}/${id}`);
    },
  };
  return store;
}

// The real dispatch flow (lib/shop/notifications/dispatch.ts) with fake storage: counts in-app writes and pushes.
function fakeNotifyDeps(opts: { failInApp?: boolean } = {}) {
  const writes: RenderedNotification[] = [];
  const deps: NotifyDeps = {
    now: () => NOW,
    async writeInApp(_uid, rendered) {
      if (opts.failInApp) throw Object.assign(new Error("unavailable"), { code: "unavailable" });
      writes.push(rendered);
      return `n${writes.length}`;
    },
    async prefsFor() {
      return { prefs: DEFAULT_PREFS, marketingConsent: false };
    },
    pushConfigured: () => false,
    async tokensFor() {
      return [];
    },
    async send() {
      return { sent: 0, failed: 0, invalidIndexes: [] };
    },
    async dropTokens() {},
    log() {},
  };
  return { deps, writes };
}

describe("notify idempotency on (uid, type, relatedId)", () => {
  test("the same event sent twice writes one in-app notification", async () => {
    const claims = claimStore();
    const { deps, writes } = fakeNotifyDeps();
    const notify = (uid: string, event: { type: string; relatedId?: string | null }) => notifyCustomerWith(deps, uid, event);
    const body = parseInternalNotify({ uid: UID, type: "order_delivered", relatedId: "GV-1" });
    assert.equal(body.ok, true);
    if (!body.ok) return;
    const first = await notifyOnce(claims, notify, body.value);
    const second = await notifyOnce(claims, notify, body.value);
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(writes.length, 1);
  });

  test("a different related id or type is a different event and is sent", async () => {
    const claims = claimStore();
    const { deps, writes } = fakeNotifyDeps();
    const notify = (uid: string, event: { type: string; relatedId?: string | null }) => notifyCustomerWith(deps, uid, event);
    const a = { uid: UID, type: "order_delivered" as const, relatedId: "GV-1" };
    await notifyOnce(claims, notify, a);
    await notifyOnce(claims, notify, { ...a, relatedId: "GV-2" });
    await notifyOnce(claims, notify, { ...a, type: "order_packed" });
    await notifyOnce(claims, notify, { ...a, uid: "other_uid_0002" });
    assert.equal(writes.length, 4);
  });

  test("when the in-app write fails the claim is released, so a retry sends it", async () => {
    const claims = claimStore();
    const failing = fakeNotifyDeps({ failInApp: true });
    const body = { uid: UID, type: "order_delivered" as const, relatedId: "GV-9" };
    const first = await notifyOnce(claims, (u, e) => notifyCustomerWith(failing.deps, u, e), body);
    assert.equal(first.duplicate, false);
    if (first.duplicate) return;
    const result: NotifyResult = first.result;
    assert.equal(result.inApp, false);
    assert.equal(claims.held.size, 0);
    const ok = fakeNotifyDeps();
    const retry = await notifyOnce(claims, (u, e) => notifyCustomerWith(ok.deps, u, e), body);
    assert.equal(retry.duplicate, false);
    assert.equal(ok.writes.length, 1);
  });

  test("the claim id is a hash: stable, 64 hex characters, and it does not contain the uid", () => {
    const id = notifyClaimId(UID, "order_delivered", "GV-1");
    assert.equal(id, notifyClaimId(UID, "order_delivered", "GV-1"));
    assert.match(id, /^[0-9a-f]{64}$/);
    assert.equal(id.includes(UID), false);
    assert.notEqual(id, notifyClaimId(UID, "order_delivered", null));
  });
});
