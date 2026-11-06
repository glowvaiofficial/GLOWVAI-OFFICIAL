import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { NOTIFICATION_TYPES, TEMPLATES, renderNotification } from "../../lib/shop/notifications/templates";
import {
  DEFAULT_PREFS,
  MAX_NOTIFICATIONS,
  MAX_TOKENS_PER_USER,
  decodeCursor,
  encodeCursor,
  isPushToken,
  linkFor,
  pageLimit,
  parseReadRequest,
  planMarkRead,
  planTokenSave,
  planTrim,
  prefsFrom,
  pushDataFor,
  pushDecision,
  tokenHash,
} from "../../lib/shop/notifications/policy";
import { notifyCustomerWith, type NotifyDeps, type SendReport } from "../../lib/shop/notifications/dispatch";

// 2026-11-06 12:00 IST (daytime) and 23:30 IST (quiet hours).
const DAY = Date.parse("2026-11-06T06:30:00Z");
const NIGHT = Date.parse("2026-11-06T18:00:00Z");
const VALID_TOKEN = "fcm-token_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-example";

describe("template rendering", () => {
  test("every event type renders fixed copy with no placeholders", () => {
    for (const type of NOTIFICATION_TYPES) {
      const r = renderNotification(type);
      assert.ok(r, type);
      assert.equal(r.title, TEMPLATES[type].title);
      assert.equal(r.body, TEMPLATES[type].body);
      assert.ok(!/[{}$%]/.test(r.title + r.body), `${type} has a placeholder`);
    }
  });

  test("copy never carries PII or internal codes", () => {
    const pii = [/@/, /\b\d{10}\b/, /\+?91/, /₹|Rs\.?\s?\d/, /\bGV-|\bTRK-|\bCOD-|\brzp_|\bpay_|\border_/i, /https?:\/\//];
    for (const type of NOTIFICATION_TYPES) {
      const text = `${TEMPLATES[type].title} ${TEMPLATES[type].body}`;
      for (const pattern of pii) assert.ok(!pattern.test(text), `${type} matches ${pattern}`);
    }
  });

  test("every type has a category and a related type, and unknown types render nothing", () => {
    assert.equal(renderNotification("order_placed")?.category, "orders");
    assert.equal(renderNotification("review_approved")?.category, "reviews");
    assert.equal(renderNotification("coins_credited")?.category, "offers");
    assert.equal(renderNotification("staff_free_text"), null);
    assert.equal(renderNotification(undefined), null);
    assert.equal(renderNotification("__proto__"), null);
  });

  test("the push data carries only fixed copy, type, related type, related id and a shop link", () => {
    const rendered = renderNotification("order_delivered")!;
    const data = pushDataFor(rendered, "GV-251106-ABC123");
    assert.deepEqual(Object.keys(data).sort(), ["body", "link", "relatedId", "relatedType", "title", "type"]);
    assert.equal(data.link, "/shop?order=GV-251106-ABC123");
    assert.equal(data.type, "order_delivered");
  });

  test("links stay inside the shop", () => {
    assert.equal(linkFor("order", "abc_123"), "/shop?order=abc_123");
    assert.equal(linkFor("order", "../evil"), "/shop?inbox=1");
    assert.equal(linkFor("account", null), "/shop?inbox=1");
  });
});

describe("push tokens", () => {
  test("the document id is a 64-character SHA-256 hex that does not reveal the token", () => {
    const id = tokenHash(VALID_TOKEN);
    assert.match(id, /^[0-9a-f]{64}$/);
    assert.equal(id, tokenHash(VALID_TOKEN));
    assert.ok(!id.includes(VALID_TOKEN));
    assert.notEqual(tokenHash(VALID_TOKEN + "x"), id);
  });

  test("only well-formed tokens are accepted", () => {
    assert.equal(isPushToken(VALID_TOKEN), true);
    assert.equal(isPushToken("short"), false);
    assert.equal(isPushToken("has spaces and more than twenty chars"), false);
    assert.equal(isPushToken(`${"a".repeat(401)}`), false);
    assert.equal(isPushToken(42), false);
  });

  test("a new token under the cap evicts nothing", () => {
    assert.deepEqual(planTokenSave([{ id: "a", updatedAt: 1 }], "b"), { alreadyRegistered: false, evict: [] });
  });

  test("a token already registered is refreshed, not duplicated", () => {
    assert.deepEqual(planTokenSave([{ id: "a", updatedAt: 1 }], "a"), { alreadyRegistered: true, evict: [] });
  });

  test("the cap is five: a sixth device replaces the least recently refreshed one", () => {
    assert.equal(MAX_TOKENS_PER_USER, 5);
    const five = [1, 2, 3, 4, 5].map((n) => ({ id: `t${n}`, updatedAt: n * 10 }));
    assert.deepEqual(planTokenSave(five, "new"), { alreadyRegistered: false, evict: ["t1"] });
  });

  test("over the cap, enough of the oldest are removed to end at five", () => {
    const seven = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: `t${n}`, updatedAt: n }));
    assert.deepEqual(planTokenSave(seven, "new").evict, ["t1", "t2", "t3"]);
  });

  test("ties in the refresh time break on id, so the result is stable", () => {
    const tied = [{ id: "b", updatedAt: 5 }, { id: "a", updatedAt: 5 }, { id: "c", updatedAt: 9 }, { id: "d", updatedAt: 9 }, { id: "e", updatedAt: 9 }];
    assert.deepEqual(planTokenSave(tied, "new").evict, ["a"]);
  });
});

describe("in-app notification cap", () => {
  const list = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `n${i}`, createdAt: 1000 + i }));

  test("the cap is 100 notifications per user", () => {
    assert.equal(MAX_NOTIFICATIONS, 100);
  });

  test("with 100 stored, one more write deletes exactly the oldest", () => {
    const existing = list(100);
    const removed = planTrim(existing);
    assert.deepEqual(removed, ["n0"]);
    assert.equal(existing.length - removed.length + 1, 100);
  });

  test("below the cap nothing is deleted", () => {
    assert.deepEqual(planTrim(list(99)), []);
    assert.deepEqual(planTrim([]), []);
  });

  test("a long backlog is trimmed to 99 kept plus the new one", () => {
    const removed = planTrim(list(150));
    assert.equal(removed.length, 51);
    assert.ok(removed.includes("n0") && removed.includes("n50") && !removed.includes("n51"));
  });
});

describe("preferences and quiet hours", () => {
  test("orders and reviews are on by default and offers are off", () => {
    assert.deepEqual(DEFAULT_PREFS, { orders: true, offers: false, reviews: true });
    assert.deepEqual(prefsFrom(undefined), DEFAULT_PREFS);
    assert.deepEqual(prefsFrom({ offers: "yes", orders: 0 }), DEFAULT_PREFS);
  });

  test("marketing is off by default: an offers push needs the preference and consent", () => {
    const base = { prefs: prefsFrom(undefined), nowMs: DAY };
    assert.deepEqual(pushDecision({ ...base, category: "offers", marketingConsent: false }), { send: false, reason: "preference-off" });
    assert.deepEqual(pushDecision({ ...base, category: "offers", marketingConsent: true }), { send: false, reason: "preference-off" });
    const optedIn = { ...base, prefs: { ...DEFAULT_PREFS, offers: true } };
    assert.deepEqual(pushDecision({ ...optedIn, category: "offers", marketingConsent: false }), { send: false, reason: "no-marketing-consent" });
    assert.deepEqual(pushDecision({ ...optedIn, category: "offers", marketingConsent: true }), { send: true });
  });

  test("consent must be an explicit true", () => {
    const prefs = { ...DEFAULT_PREFS, offers: true };
    assert.deepEqual(pushDecision({ category: "offers", prefs, marketingConsent: "true" as unknown as boolean, nowMs: DAY }), { send: false, reason: "no-marketing-consent" });
  });

  test("order pushes follow the orders preference and quiet hours", () => {
    assert.deepEqual(pushDecision({ category: "orders", prefs: DEFAULT_PREFS, marketingConsent: false, nowMs: DAY }), { send: true });
    assert.deepEqual(pushDecision({ category: "orders", prefs: { ...DEFAULT_PREFS, orders: false }, marketingConsent: false, nowMs: DAY }), { send: false, reason: "preference-off" });
    assert.deepEqual(pushDecision({ category: "orders", prefs: DEFAULT_PREFS, marketingConsent: false, nowMs: NIGHT }), { send: false, reason: "quiet-hours" });
  });
});

describe("read marking is owned-only", () => {
  const owned = [
    { id: "a", readAt: null },
    { id: "b", readAt: 5 },
    { id: "c", readAt: null },
  ];

  test("only the caller's unread notifications among the requested ids are marked", () => {
    assert.deepEqual(planMarkRead(owned, { ids: ["a", "b", "not-mine"] }), ["a"]);
  });

  test("ids that are not in the caller's collection change nothing", () => {
    assert.deepEqual(planMarkRead(owned, { ids: ["someone-else-doc"] }), []);
  });

  test("all marks every unread notification and nothing already read", () => {
    assert.deepEqual(planMarkRead(owned, { all: true }), ["a", "c"]);
  });

  test("request validation: at most 100 plain ids, or all", () => {
    assert.deepEqual(parseReadRequest({ all: true }), { all: true });
    assert.equal(parseReadRequest({ ids: [] }), null);
    assert.equal(parseReadRequest({ ids: ["bad/id"] }), null);
    assert.equal(parseReadRequest({ ids: Array.from({ length: 101 }, (_, i) => `i${i}`) }), null);
    assert.equal(parseReadRequest(null), null);
  });
});

describe("paging", () => {
  test("cursors round-trip and reject anything else", () => {
    const cursor = encodeCursor(1_700_000_000_000, "abc_DEF-1");
    assert.deepEqual(decodeCursor(cursor), { createdAt: 1_700_000_000_000, id: "abc_DEF-1" });
    assert.equal(decodeCursor("nope"), null);
    assert.equal(decodeCursor("1_bad id"), null);
    assert.equal(decodeCursor(null), null);
  });

  test("the page size is 30 at most", () => {
    assert.equal(pageLimit(null), 30);
    assert.equal(pageLimit("5"), 5);
    assert.equal(pageLimit("500"), 30);
    assert.equal(pageLimit("0"), 30);
    assert.equal(pageLimit("abc"), 30);
  });
});

// Fakes for the dispatch flow. Each test can override one of them.
function fakes(overrides: Partial<NotifyDeps> = {}) {
  const calls = { inApp: [] as unknown[], sends: [] as { tokens: string[]; data: Record<string, string> }[], dropped: [] as string[][], logs: [] as string[] };
  const deps: NotifyDeps = {
    now: () => DAY,
    writeInApp: async (_uid, rendered, relatedId) => {
      calls.inApp.push({ type: rendered.type, relatedId });
      return "doc1";
    },
    prefsFor: async () => ({ prefs: DEFAULT_PREFS, marketingConsent: false }),
    pushConfigured: () => true,
    tokensFor: async () => [{ id: tokenHash(VALID_TOKEN), token: VALID_TOKEN }],
    send: async (tokens, data): Promise<SendReport> => {
      calls.sends.push({ tokens, data });
      return { sent: tokens.length, failed: 0, invalidIndexes: [] };
    },
    dropTokens: async (_uid, ids) => {
      calls.dropped.push(ids);
    },
    log: (message, detail) => {
      calls.logs.push(`${message} ${JSON.stringify(detail)}`);
    },
    ...overrides,
  };
  return { deps, calls };
}

describe("notifyCustomer flow", () => {
  const uid = "uid_customer_123";

  test("writes the in-app notification and sends a push to each device", async () => {
    const { deps, calls } = fakes();
    const result = await notifyCustomerWith(deps, uid, { type: "order_placed", relatedId: "GV-1" });
    assert.deepEqual(result, { inApp: true, push: "sent" });
    assert.deepEqual(calls.inApp, [{ type: "order_placed", relatedId: "GV-1" }]);
    assert.equal(calls.sends.length, 1);
    assert.deepEqual(calls.sends[0].tokens, [VALID_TOKEN]);
  });

  test("the in-app notification is written even when the push is skipped", async () => {
    const { deps, calls } = fakes({ now: () => NIGHT });
    const result = await notifyCustomerWith(deps, uid, { type: "order_delivered", relatedId: "GV-1" });
    assert.deepEqual(result, { inApp: true, push: "skipped", reason: "quiet-hours" });
    assert.equal(calls.inApp.length, 1);
    assert.equal(calls.sends.length, 0);
  });

  test("no push when messaging is not configured, but the in-app notification is kept", async () => {
    const { deps, calls } = fakes({ pushConfigured: () => false });
    const result = await notifyCustomerWith(deps, uid, { type: "order_placed" });
    assert.deepEqual(result, { inApp: true, push: "not-configured" });
    assert.equal(calls.sends.length, 0);
  });

  test("offers never push without consent, even with the preference on", async () => {
    const { deps, calls } = fakes({ prefsFor: async () => ({ prefs: { ...DEFAULT_PREFS, offers: true }, marketingConsent: false }) });
    const result = await notifyCustomerWith(deps, uid, { type: "referral_reward" });
    assert.deepEqual(result, { inApp: true, push: "skipped", reason: "no-marketing-consent" });
    assert.equal(calls.sends.length, 0);
  });

  test("tokens FCM reports as invalid are removed", async () => {
    const { deps, calls } = fakes({
      tokensFor: async () => [
        { id: "t1", token: VALID_TOKEN },
        { id: "t2", token: VALID_TOKEN + "2" },
      ],
      send: async () => ({ sent: 1, failed: 1, invalidIndexes: [1] }),
    });
    await notifyCustomerWith(deps, uid, { type: "order_placed" });
    assert.deepEqual(calls.dropped, [["t2"]]);
  });

  test("an unknown type or a bad customer id writes nothing", async () => {
    const { deps, calls } = fakes();
    assert.equal((await notifyCustomerWith(deps, uid, { type: "free_text" })).push, "failed");
    assert.equal((await notifyCustomerWith(deps, "x", { type: "order_placed" })).push, "failed");
    assert.equal(calls.inApp.length, 0);
    assert.equal(calls.sends.length, 0);
  });

  test("a related id that is not a plain id is dropped, not stored", async () => {
    const { deps, calls } = fakes();
    await notifyCustomerWith(deps, uid, { type: "order_placed", relatedId: "a/b" });
    assert.deepEqual(calls.inApp, [{ type: "order_placed", relatedId: null }]);
  });

  test("never throws, whatever the dependencies do", async () => {
    const boom = async (): Promise<never> => {
      throw Object.assign(new Error("firestore down for uid_customer_123"), { code: 14 });
    };
    const variants: Partial<NotifyDeps>[] = [
      { writeInApp: boom },
      { prefsFor: boom },
      { tokensFor: boom },
      { send: boom },
      { dropTokens: boom },
      { now: () => { throw new Error("clock"); } },
      { pushConfigured: () => { throw new Error("config"); } },
      { log: () => { throw new Error("logger"); } },
      { send: async () => ({ sent: 0, failed: 1, invalidIndexes: [0] }), dropTokens: boom },
    ];
    for (const override of variants) {
      const { deps } = fakes(override);
      const result = await notifyCustomerWith(deps, uid, { type: "order_placed", relatedId: "GV-1" });
      assert.equal(typeof result.push, "string");
    }
    const nullEvent = await notifyCustomerWith(fakes().deps, uid, null as unknown as { type: string });
    assert.equal(nullEvent.push, "failed");
  });

  test("logs carry the event type and error code, never the customer id or the token", async () => {
    const { deps, calls } = fakes({
      writeInApp: async () => {
        throw Object.assign(new Error(`failed at users/${uid}`), { code: "permission-denied" });
      },
      send: async () => ({ sent: 1, failed: 0, invalidIndexes: [] }),
    });
    await notifyCustomerWith(deps, uid, { type: "order_placed" });
    const all = calls.logs.join("\n");
    assert.ok(all.includes("permission-denied"));
    assert.ok(!all.includes(uid));
    assert.ok(!all.includes(VALID_TOKEN));
  });
});
