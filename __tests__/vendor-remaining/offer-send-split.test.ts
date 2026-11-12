import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { notifyVendorOfferWith, sendOfferBySender, type OfferMessage, type OfferPushDeps, type OfferSendReport } from "../../lib/vendor/push";
import { sendExpoBatch } from "../../lib/shop/notifications/expoSend";
import { EXPO_PUSH_URL, EXPO_CHUNK_SIZE } from "../../lib/shop/notifications/expoPush";

const MSG: OfferMessage = { title: "New order nearby", body: "Open GlowVai Store.", data: { type: "vendor_offer", orderId: "GV-1" } };
const EXPO_A = "ExponentPushToken[aaaaaaaaaaaa1111]";
const EXPO_B = "ExponentPushToken[bbbbbbbbbbbb2222]";
const FCM_A = "fcm-device-token-aaaaaaaaaaaaaaaaaaa";
const FCM_B = "fcm-device-token-bbbbbbbbbbbbbbbbbbb";

function recorder(report: OfferSendReport = { successCount: 0, failureCount: 0, invalidIndexes: [] }) {
  const calls: string[][] = [];
  const send = async (tokens: string[]) => {
    calls.push(tokens);
    return { ...report, successCount: tokens.length };
  };
  return { calls, send };
}

describe("vendor offer send: each token goes to the sender for its type", () => {
  test("FCM tokens never reach the Expo sender and EXPO tokens never reach FCM", async () => {
    const fcm = recorder();
    const expo = recorder();
    const tokens = [FCM_A, EXPO_A, FCM_B, EXPO_B];
    const r = await sendOfferBySender(tokens, ["FCM", "EXPO", "FCM", "EXPO"], MSG, { FCM: fcm.send, EXPO: expo.send });
    assert.deepEqual(fcm.calls, [[FCM_A, FCM_B]]);
    assert.deepEqual(expo.calls, [[EXPO_A, EXPO_B]]);
    assert.deepEqual(r, { successCount: 4, failureCount: 0, invalidIndexes: [] });
  });

  test("a token with no type is treated as FCM (old registrations)", async () => {
    const fcm = recorder();
    const expo = recorder();
    await sendOfferBySender([FCM_A, EXPO_A], [undefined as unknown as "FCM", "EXPO"], MSG, { FCM: fcm.send, EXPO: expo.send });
    assert.deepEqual(fcm.calls, [[FCM_A]]);
    assert.deepEqual(expo.calls, [[EXPO_A]]);
  });

  test("only one kind present: the other sender is not called", async () => {
    const fcm = recorder();
    const expo = recorder();
    await sendOfferBySender([EXPO_A], ["EXPO"], MSG, { FCM: fcm.send, EXPO: expo.send });
    assert.equal(fcm.calls.length, 0);
    assert.deepEqual(expo.calls, [[EXPO_A]]);
  });

  test("invalid indexes from each sender map back to the original token positions", async () => {
    const fcm = recorder({ successCount: 0, failureCount: 1, invalidIndexes: [1] });
    const expo = recorder({ successCount: 0, failureCount: 1, invalidIndexes: [0] });
    const r = await sendOfferBySender([FCM_A, EXPO_A, FCM_B, EXPO_B], ["FCM", "EXPO", "FCM", "EXPO"], MSG, { FCM: fcm.send, EXPO: expo.send });
    // FCM sends [FCM_A, FCM_B]: index 1 is FCM_B (position 2). Expo sends [EXPO_A, EXPO_B]: index 0 is EXPO_A (position 1).
    assert.deepEqual(r.invalidIndexes.sort(), [1, 2]);
    assert.equal(r.failureCount, 2);
  });

  test("a sender that throws counts its tokens as failed and the other sender still runs", async () => {
    const expo = recorder();
    const r = await sendOfferBySender(
      [FCM_A, EXPO_A],
      ["FCM", "EXPO"],
      MSG,
      {
        FCM: async () => {
          throw new Error("messaging down");
        },
        EXPO: expo.send,
      },
    );
    assert.deepEqual(expo.calls, [[EXPO_A]]);
    assert.deepEqual(r, { successCount: 1, failureCount: 1, invalidIndexes: [] });
  });

  test("the offer pipeline passes each stored token's type through to the send", async () => {
    let seenTypes: string[] = [];
    const deps: OfferPushDeps = {
      loadTokens: async () => [
        { id: "h1", token: FCM_A },
        { id: "h2", token: EXPO_A, tokenType: "EXPO" },
      ],
      send: async (_tokens, _message, types) => {
        seenTypes = types;
        return { successCount: 2, failureCount: 0, invalidIndexes: [] };
      },
      removeTokens: async () => {},
      log: () => {},
    };
    const r = await notifyVendorOfferWith(deps, "uid-1", "GV-1");
    assert.deepEqual(seenTypes, ["FCM", "EXPO"]);
    assert.deepEqual(r, { sent: 2, failed: 0, removed: 0 });
  });
});

describe("shared Expo batch sender (customers and vendors)", () => {
  const okFor = (n: number) => ({ json: async () => ({ data: Array.from({ length: n }, () => ({ status: "ok" })) }) });

  test("one request per 100 tokens, to the Expo push URL, with a message per token", async () => {
    const urls: string[] = [];
    const bodies: unknown[] = [];
    const tokens = Array.from({ length: EXPO_CHUNK_SIZE + 5 }, (_, i) => `ExponentPushToken[token${String(i).padStart(6, "0")}]`);
    const report = await sendExpoBatch(tokens, { title: "T", body: "B" }, async (url, init) => {
      urls.push(url);
      bodies.push(JSON.parse(init.body));
      return okFor(JSON.parse(init.body).length);
    });
    assert.deepEqual(urls, [EXPO_PUSH_URL, EXPO_PUSH_URL]);
    assert.equal((bodies[0] as unknown[]).length, 100);
    assert.equal((bodies[1] as unknown[]).length, 5);
    assert.deepEqual(report, { sent: 105, failed: 0, invalidIndexes: [] });
  });

  test("DeviceNotRegistered is reported as an invalid index; other errors are only failures", async () => {
    const report = await sendExpoBatch([EXPO_A, EXPO_B, EXPO_A + "x"], { title: "T", body: "B" }, async () => ({
      json: async () => ({
        data: [{ status: "ok" }, { status: "error", details: { error: "DeviceNotRegistered" } }, { status: "error", details: { error: "MessageRateExceeded" } }],
      }),
    }));
    assert.deepEqual(report, { sent: 1, failed: 2, invalidIndexes: [1] });
  });

  test("a request that throws or returns a malformed answer never throws; its tokens count as failed", async () => {
    const thrown = await sendExpoBatch([EXPO_A, EXPO_B], {}, async () => {
      throw new Error("network");
    });
    assert.deepEqual(thrown, { sent: 0, failed: 2, invalidIndexes: [] });
    const malformed = await sendExpoBatch([EXPO_A], {}, async () => ({ json: async () => ({ nope: true }) }));
    assert.deepEqual(malformed, { sent: 0, failed: 1, invalidIndexes: [] });
  });

  test("no tokens: no request is made", async () => {
    let calls = 0;
    assert.deepEqual(await sendExpoBatch([], {}, async () => (calls++, okFor(0))), { sent: 0, failed: 0, invalidIndexes: [] });
    assert.equal(calls, 0);
  });
});
