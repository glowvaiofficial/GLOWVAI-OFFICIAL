import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PUSH_TOKEN_MAX, deviceCapAllows, deviceCapError, notifyVendorOfferWith, parsePushToken, tokenIdOf, type OfferPushDeps } from "../../lib/vendor/push";

const TOKEN = "fcm-device-token-abcdefghijklmnop1234567890";

describe("push token ids and validation", () => {
  test("the id is the SHA-256 of the token: 64 hex characters, stable, and not the token", () => {
    const id = tokenIdOf(TOKEN);
    assert.match(id, /^[0-9a-f]{64}$/);
    assert.equal(id, tokenIdOf(TOKEN));
    assert.notEqual(id, tokenIdOf(TOKEN + "x"));
    assert.equal(id.includes(TOKEN), false);
  });

  test("a valid token and platform parse; platform is case-insensitive", () => {
    const r = parsePushToken({ token: `  ${TOKEN}  `, platform: "Android" });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, { token: TOKEN, platform: "android" });
  });

  test("short, empty, spaced or non-string tokens are refused", () => {
    for (const bad of ["", "short", "has a space in the middle of it", 12345678901234567890123, null]) {
      const r = parsePushToken({ token: bad, platform: "ios" });
      assert.equal(r.ok, false, String(bad));
      if (!r.ok) assert.equal(r.field, "token");
    }
    const huge = parsePushToken({ token: "x".repeat(4097), platform: "ios" });
    assert.equal(huge.ok, false);
  });

  test("an unknown platform is refused", () => {
    const r = parsePushToken({ token: TOKEN, platform: "blackberry" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.field, "platform");
  });
});

describe("device cap", () => {
  test("at most three devices per vendor", () => {
    assert.equal(PUSH_TOKEN_MAX, 3);
    assert.equal(deviceCapAllows(0, false), true);
    assert.equal(deviceCapAllows(2, false), true);
    assert.equal(deviceCapAllows(3, false), false);
  });

  test("a device that is already registered can always be refreshed, even at the cap", () => {
    assert.equal(deviceCapAllows(3, true), true);
  });

  test("the refusal is an input error on the token field", () => {
    const err = deviceCapError();
    assert.equal(err.code, "INVALID_INPUT");
    assert.equal(err.status, 400);
    assert.equal(err.extra.field, "token");
  });
});

function deps(overrides: Partial<OfferPushDeps> = {}) {
  const calls = { send: 0, removed: [] as string[][], logs: [] as string[] };
  const d: OfferPushDeps = {
    loadTokens: async () => [
      { id: "h1", token: TOKEN },
      { id: "h2", token: `${TOKEN}-second` },
    ],
    send: async (tokens) => {
      calls.send++;
      return { successCount: tokens.length, failureCount: 0, invalidIndexes: [] };
    },
    removeTokens: async (_uid, ids) => {
      calls.removed.push(ids);
    },
    log: (message, code) => {
      calls.logs.push(`${message}:${code ?? ""}`);
    },
    ...overrides,
  };
  return { d, calls };
}

describe("notifyVendorOffer core never throws", () => {
  test("sends to every stored device and reports the counts", async () => {
    const { d, calls } = deps();
    const r = await notifyVendorOfferWith(d, "uid-1", "GV-1");
    assert.deepEqual(r, { sent: 2, failed: 0, removed: 0 });
    assert.equal(calls.send, 1);
  });

  test("no stored tokens: nothing is sent and nothing fails", async () => {
    const { d, calls } = deps({ loadTokens: async () => [] });
    assert.deepEqual(await notifyVendorOfferWith(d, "uid-1", "GV-1"), { sent: 0, failed: 0, removed: 0 });
    assert.equal(calls.send, 0);
  });

  test("a read that throws is logged with a code and swallowed", async () => {
    const err = Object.assign(new Error("boom with uid uid-1"), { code: "permission-denied" });
    const { d, calls } = deps({
      loadTokens: async () => {
        throw err;
      },
    });
    const r = await notifyVendorOfferWith(d, "uid-1", "GV-1");
    assert.deepEqual(r, { sent: 0, failed: 0, removed: 0 });
    assert.deepEqual(calls.logs, ["vendor offer push failed:permission-denied"]);
    assert.equal(calls.logs.join("").includes("uid-1"), false);
  });

  test("a send that throws is swallowed, even without an error code", async () => {
    const { d } = deps({
      send: async () => {
        throw new Error("network down");
      },
    });
    await assert.doesNotReject(() => notifyVendorOfferWith(d, "uid-1", "GV-1"));
    assert.deepEqual(await notifyVendorOfferWith(d, "uid-1", "GV-1"), { sent: 0, failed: 0, removed: 0 });
  });

  test("a removal that throws is swallowed", async () => {
    const { d } = deps({
      send: async () => ({ successCount: 0, failureCount: 1, invalidIndexes: [0] }),
      removeTokens: async () => {
        throw new Error("write failed");
      },
    });
    await assert.doesNotReject(() => notifyVendorOfferWith(d, "uid-1", "GV-1"));
  });

  test("missing ids are a no-op, not an error", async () => {
    const { d, calls } = deps();
    assert.deepEqual(await notifyVendorOfferWith(d, "", "GV-1"), { sent: 0, failed: 0, removed: 0 });
    assert.deepEqual(await notifyVendorOfferWith(d, "uid-1", ""), { sent: 0, failed: 0, removed: 0 });
    assert.equal(calls.send, 0);
  });

  test("tokens the device has rejected are removed, and only those", async () => {
    const { d, calls } = deps({
      loadTokens: async () => [
        { id: "h1", token: TOKEN },
        { id: "h2", token: `${TOKEN}-second` },
        { id: "h3", token: `${TOKEN}-third` },
      ],
      send: async () => ({ successCount: 2, failureCount: 1, invalidIndexes: [1] }),
    });
    const r = await notifyVendorOfferWith(d, "uid-1", "GV-1");
    assert.deepEqual(r, { sent: 2, failed: 1, removed: 1 });
    assert.deepEqual(calls.removed, [["h2"]]);
  });

  test("never more than three tokens are used, and malformed stored tokens are skipped", async () => {
    let sentTo: string[] = [];
    const { d } = deps({
      loadTokens: async () => [
        { id: "a", token: "short" },
        { id: "b", token: TOKEN },
        { id: "c", token: `${TOKEN}-c` },
        { id: "d", token: `${TOKEN}-d` },
        { id: "e", token: `${TOKEN}-e` },
      ],
      send: async (tokens) => {
        sentTo = tokens;
        return { successCount: tokens.length, failureCount: 0, invalidIndexes: [] };
      },
    });
    await notifyVendorOfferWith(d, "uid-1", "GV-1");
    assert.equal(sentTo.length, 3);
    assert.equal(sentTo.includes("short"), false);
  });
});
