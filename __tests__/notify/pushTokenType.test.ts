import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  EXPO_CHANNEL_ID,
  EXPO_CHUNK_SIZE,
  EXPO_PUSH_URL,
  buildExpoMessages,
  chunkIndexes,
  expoReport,
  isExpoToken,
} from "../../lib/shop/notifications/expoPush";
import { isPushToken, isTokenOfType, parseTokenType } from "../../lib/shop/notifications/policy";
import { notifyCustomerWith, type NotifyDeps, type SendReport } from "../../lib/shop/notifications/dispatch";

const EXPO_TOKEN = "ExponentPushToken[abcdefghij1234567890]";
const FCM_TOKEN = "fcm-token_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-example";
const DAY = Date.parse("2026-11-06T06:30:00Z");

describe("tokenType on the token route", () => {
  test("a request without tokenType is FCM, so the web client keeps working", () => {
    assert.equal(parseTokenType(undefined), "FCM");
  });

  test("EXPO and FCM are the only accepted values; anything else is refused", () => {
    assert.equal(parseTokenType("EXPO"), "EXPO");
    assert.equal(parseTokenType("FCM"), "FCM");
    assert.equal(parseTokenType("expo"), null);
    assert.equal(parseTokenType("APNS"), null);
    assert.equal(parseTokenType(null), null);
    assert.equal(parseTokenType(1), null);
  });

  test("each token type only accepts its own token shape", () => {
    assert.equal(isTokenOfType("EXPO", EXPO_TOKEN), true);
    assert.equal(isTokenOfType("EXPO", FCM_TOKEN), false);
    assert.equal(isTokenOfType("FCM", FCM_TOKEN), true);
    assert.equal(isTokenOfType("FCM", EXPO_TOKEN), false);
    assert.equal(isPushToken(FCM_TOKEN), true);
    assert.equal(isPushToken(EXPO_TOKEN), false);
  });

  test("Expo token shape: brackets and a short body are refused", () => {
    assert.equal(isExpoToken("ExponentPushToken[abcdefghij1234567890]"), true);
    assert.equal(isExpoToken("ExpoPushToken[abcdefghij1234567890]"), true);
    assert.equal(isExpoToken("ExponentPushToken[short]"), false);
    assert.equal(isExpoToken("ExponentPushToken[abcdefghij1234567890"), false);
    assert.equal(isExpoToken(undefined), false);
  });
});

describe("the Expo sender", () => {
  test("one message per token, with title and body from the payload and the order-updates channel", () => {
    const data = { title: "Order packed", body: "Your order is packed.", link: "/orders/GV-1", type: "order_packed" };
    const messages = buildExpoMessages([EXPO_TOKEN], data);
    assert.deepEqual(messages, [
      { to: EXPO_TOKEN, title: "Order packed", body: "Your order is packed.", data, priority: "high", channelId: EXPO_CHANNEL_ID },
    ]);
    assert.equal(EXPO_CHANNEL_ID, "order-updates");
    assert.equal(EXPO_PUSH_URL, "https://exp.host/--/api/v2/push/send");
  });

  test("tokens are split into chunks of at most 100 requests", () => {
    assert.deepEqual(chunkIndexes(0), []);
    const chunks = chunkIndexes(250);
    assert.deepEqual(chunks.map((c) => c.length), [EXPO_CHUNK_SIZE, EXPO_CHUNK_SIZE, 50]);
    assert.equal(chunks[2][0], 200);
  });

  test("Expo tickets count sent and failed, and only DeviceNotRegistered drops a token", () => {
    const report = expoReport(
      {
        data: [
          { status: "ok", id: "t1" },
          { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
          { status: "error", message: "rate", details: { error: "MessageRateExceeded" } },
        ],
      },
      3,
    );
    assert.deepEqual(report, { sent: 1, failed: 2, invalidIndexes: [1] });
  });

  test("a malformed or short answer counts every message as failed and drops nothing", () => {
    assert.deepEqual(expoReport(null, 2), { sent: 0, failed: 2, invalidIndexes: [] });
    assert.deepEqual(expoReport({ errors: [] }, 2), { sent: 0, failed: 2, invalidIndexes: [] });
    assert.deepEqual(expoReport({ data: [{ status: "ok" }] }, 2), { sent: 0, failed: 2, invalidIndexes: [] });
  });
});

describe("the dispatch flow passes token types to the sender", () => {
  function deps(tokens: { id: string; token: string; tokenType?: "EXPO" | "FCM" }[]) {
    const calls: { tokens: string[]; types: unknown }[] = [];
    const d: NotifyDeps = {
      now: () => DAY,
      writeInApp: async () => "doc1",
      prefsFor: async () => ({ prefs: { orders: true, offers: false, reviews: true }, marketingConsent: false }),
      pushConfigured: () => true,
      tokensFor: async () => tokens,
      send: async (sendTokens, _data, types): Promise<SendReport> => {
        calls.push({ tokens: sendTokens, types });
        return { sent: sendTokens.length, failed: 0, invalidIndexes: [] };
      },
      dropTokens: async () => undefined,
      log: () => undefined,
    };
    return { d, calls };
  }

  test("each token goes with its type, and a stored token with no type is FCM", async () => {
    const { d, calls } = deps([
      { id: "a", token: EXPO_TOKEN, tokenType: "EXPO" },
      { id: "b", token: FCM_TOKEN },
    ]);
    const result = await notifyCustomerWith(d, "uid_abcdef123", { type: "order_placed", relatedId: "GV-1" });
    assert.equal(result.push, "sent");
    assert.deepEqual(calls[0].tokens, [EXPO_TOKEN, FCM_TOKEN]);
    assert.deepEqual(calls[0].types, ["EXPO", "FCM"]);
  });
});
