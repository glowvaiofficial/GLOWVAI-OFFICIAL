// Tests for lib/shop/rateLimit.ts. No network and no real Firestore: a small in-memory fake stands in for the Firestore
// handle (collection().doc() and runTransaction with get/set), and the fake records every write so the tests can check
// exactly what would be stored.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase-admin/firestore";
import {
  RATE_LIMIT_COLLECTION,
  STORE_TIMEOUT_MS,
  checkRateLimit,
  decide,
  hashKey,
  memoryCheck,
  nextWindow,
  type RateLimitDoc,
} from "../../lib/shop/rateLimit";

type DocRef = { id: string; collection: string };
type Write = { collection: string; id: string; data: Record<string, unknown> };

// Minimal stand-in for the Firestore admin handle used by lib/shop/rateLimit.ts.
class FakeFirestore {
  readonly collections: string[] = [];
  readonly writes: Write[] = [];
  readonly docs = new Map<string, Record<string, unknown>>();
  failWith: Error | null = null;
  hang = false;
  transactions = 0;

  collection(name: string) {
    this.collections.push(name);
    return { doc: (id: string): DocRef => ({ id, collection: name }) };
  }

  async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    if (this.failWith) throw this.failWith;
    if (this.hang) return new Promise<T>(() => {});
    this.transactions += 1;
    const pending: Array<{ ref: DocRef; data: Record<string, unknown> }> = [];
    const tx = {
      get: async (ref: DocRef) => {
        const data = this.docs.get(ref.id);
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
      },
      set: (ref: DocRef, data: Record<string, unknown>) => {
        pending.push({ ref, data });
      },
    };
    const result = await fn(tx);
    for (const p of pending) {
      this.docs.set(p.ref.id, p.data);
      this.writes.push({ collection: p.ref.collection, id: p.ref.id, data: p.data });
    }
    return result;
  }

  asFirestore(): Firestore {
    return this as unknown as Firestore;
  }
}

let store: FakeFirestore;

beforeEach(() => {
  store = new FakeFirestore();
});

afterEach(() => {
  mock.restoreAll();
});

describe("backend selection", () => {
  it("uses the in-memory limiter and never touches Firestore when no store is passed", async () => {
    const r = await checkRateLimit({ key: "sel:none:1", max: 2, windowMs: 60_000 });
    assert.deepEqual(r, { allowed: true, remaining: 1, retryAfterSeconds: 0 });
    const n = await checkRateLimit({ key: "sel:null:1", max: 2, windowMs: 60_000 }, null);
    assert.equal(n.allowed, true);
    assert.equal(store.transactions, 0);
  });

  it("uses one Firestore transaction in the rateLimits collection when a store is passed", async () => {
    await checkRateLimit({ key: "sel:fs:1", max: 5, windowMs: 60_000 }, store.asFirestore());
    assert.equal(store.transactions, 1);
    assert.equal(RATE_LIMIT_COLLECTION, "rateLimits");
    assert.deepEqual(store.collections, ["rateLimits"]);
    assert.equal(store.writes.length, 1);
    assert.equal(store.writes[0].collection, "rateLimits");
  });
});

describe("window maths", () => {
  const windowMs = 60_000;

  it("starts a new window at the first hit, with expiresAt at the window end", () => {
    assert.deepEqual(nextWindow(undefined, windowMs, 5_000), { count: 1, windowStart: 5_000, expiresAt: 65_000 });
  });

  it("keeps the window start and adds one while the window is live", () => {
    const stored: RateLimitDoc = { count: 3, windowStart: 5_000, expiresAt: 65_000 };
    assert.deepEqual(nextWindow(stored, windowMs, 30_000), { count: 4, windowStart: 5_000, expiresAt: 65_000 });
  });

  it("resets the count once the window has passed", () => {
    const stored: RateLimitDoc = { count: 9, windowStart: 5_000, expiresAt: 65_000 };
    assert.deepEqual(nextWindow(stored, windowMs, 65_000), { count: 1, windowStart: 65_000, expiresAt: 125_000 });
  });

  it("treats a damaged or future-dated document as a fresh window", () => {
    assert.equal(nextWindow({ count: "x" as unknown as number, windowStart: 5_000 }, windowMs, 6_000).count, 1);
    assert.equal(nextWindow({ count: 4, windowStart: 9_000 }, windowMs, 6_000).count, 1);
  });

  it("allows the request that reaches max and refuses the next one, with seconds left in the window", () => {
    assert.deepEqual(decide({ count: 5, windowStart: 0, expiresAt: windowMs }, 5, windowMs, 1_000), {
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });
    // windowStart 1,000 ms, windowMs 60,000 ms, now 31,000 ms: 30,000 ms left, so 30 s.
    assert.deepEqual(decide({ count: 6, windowStart: 1_000, expiresAt: 61_000 }, 5, windowMs, 31_000), {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 30,
    });
  });

  it("through Firestore: counts per key, refuses over max, and starts again after the window", async (t) => {
    let clock = 10 * windowMs;
    t.mock.method(Date, "now", () => clock);
    const fs = store.asFirestore();
    const a = await checkRateLimit({ key: "maths:fs:1", max: 2, windowMs }, fs);
    const b = await checkRateLimit({ key: "maths:fs:1", max: 2, windowMs }, fs);
    const c = await checkRateLimit({ key: "maths:fs:1", max: 2, windowMs }, fs);
    assert.deepEqual(a, { allowed: true, remaining: 1, retryAfterSeconds: 0 });
    assert.deepEqual(b, { allowed: true, remaining: 0, retryAfterSeconds: 0 });
    assert.equal(c.allowed, false);
    assert.equal(c.remaining, 0);
    assert.equal(c.retryAfterSeconds, 60);
    clock += windowMs;
    const d = await checkRateLimit({ key: "maths:fs:1", max: 2, windowMs }, fs);
    assert.deepEqual(d, { allowed: true, remaining: 1, retryAfterSeconds: 0 });
  });

  it("in-memory: refuses past the max, reports remaining and a retryAfter from the oldest hit", () => {
    const key = "maths:memory:1";
    const t0 = 1_000_000;
    assert.deepEqual(memoryCheck(key, 3, 60_000, t0), { allowed: true, remaining: 2, retryAfterSeconds: 0 });
    assert.deepEqual(memoryCheck(key, 3, 60_000, t0 + 1), { allowed: true, remaining: 1, retryAfterSeconds: 0 });
    assert.deepEqual(memoryCheck(key, 3, 60_000, t0 + 2), { allowed: true, remaining: 0, retryAfterSeconds: 0 });
    assert.deepEqual(memoryCheck(key, 3, 60_000, t0 + 10_000), { allowed: false, remaining: 0, retryAfterSeconds: 50 });
    assert.equal(memoryCheck(key, 3, 60_000, t0 + 60_001).allowed, true);
  });
});

describe("fail open and fallback", () => {
  it("falls back to the in-memory limiter when Firestore throws, and still enforces the limit there", async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    store.failWith = new Error("unavailable");
    const key = "failopen:throw:1";
    const first = await checkRateLimit({ key, max: 1, windowMs: 60_000 }, store.asFirestore());
    assert.equal(first.allowed, true, "a Firestore error does not refuse the request");
    const second = await checkRateLimit({ key, max: 1, windowMs: 60_000 }, store.asFirestore());
    assert.equal(second.allowed, false, "the in-memory limiter still counts");
    assert.equal(warn.mock.callCount(), 2);
    assert.equal(store.writes.length, 0, "nothing is written when the transaction fails");
  });

  it("gives up after the store timeout and falls back when Firestore never answers", async (t) => {
    t.mock.method(console, "warn", () => {});
    store.hang = true;
    const started = Date.now();
    const r = await checkRateLimit({ key: "failopen:timeout:1", max: 5, windowMs: 60_000 }, store.asFirestore());
    const took = Date.now() - started;
    assert.equal(r.allowed, true);
    assert.ok(took >= STORE_TIMEOUT_MS - 100 && took < STORE_TIMEOUT_MS + 1000, `expected about ${STORE_TIMEOUT_MS} ms, took ${took} ms`);
  });

  it("logs only the error type or code, never the key, the IP, the uid or the error message", async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    store.failWith = new Error("failed for ip:orders-post:203.0.113.99 and user uid-ABC123xyz");
    await checkRateLimit({ key: "ip:orders-post:203.0.113.99", max: 5, windowMs: 60_000 }, store.asFirestore());
    const coded = Object.assign(new Error("secret text 203.0.113.99"), { code: 14 });
    store.failWith = coded;
    await checkRateLimit({ key: "user:orders-post:uid-ABC123xyz", max: 5, windowMs: 60_000 }, store.asFirestore());
    const logged = warn.mock.calls.map((c) => String(c.arguments[0])).join("\n");
    assert.ok(logged.includes("[ratelimit]"));
    assert.ok(logged.includes("Error"));
    assert.ok(logged.includes("firestore_14"));
    for (const secret of ["203.0.113.99", "uid-ABC123xyz", "orders-post", "secret text"]) {
      assert.ok(!logged.includes(secret), `log must not contain ${secret}`);
    }
  });
});

describe("hashed document ids and minimal stored data", () => {
  it("uses the SHA-256 of the key as the document id, never the raw key, IP or uid", async () => {
    const ip = "203.0.113.77";
    const uid = "uid-ABC123xyz";
    await checkRateLimit({ key: `ip:orders-post:${ip}`, max: 60, windowMs: 3_600_000 }, store.asFirestore());
    await checkRateLimit({ key: `user:orders-post:${uid}`, max: 20, windowMs: 3_600_000 }, store.asFirestore());
    const ids = [...store.docs.keys()];
    assert.equal(ids.length, 2);
    for (const id of ids) {
      assert.match(id, /^[0-9a-f]{64}$/);
      assert.ok(!id.includes(ip) && !id.includes(uid) && !id.includes("orders-post"));
    }
    assert.ok(ids.includes(hashKey(`ip:orders-post:${ip}`)));
    assert.ok(ids.includes(hashKey(`user:orders-post:${uid}`)));
  });

  it("writes only count, windowStart and expiresAt, and no raw key, IP, uid or route name anywhere", async () => {
    const ip = "198.51.100.23";
    const uid = "uid-ZZZ999qqq";
    await checkRateLimit({ key: `ip:support-post:${ip}`, max: 30, windowMs: 60_000 }, store.asFirestore());
    await checkRateLimit({ key: `user:support-ticket:${uid}`, max: 5, windowMs: 3_600_000 }, store.asFirestore());
    assert.equal(store.writes.length, 2);
    for (const w of store.writes) {
      assert.deepEqual(Object.keys(w.data).sort(), ["count", "expiresAt", "windowStart"]);
      for (const v of Object.values(w.data)) assert.equal(typeof v, "number");
      const wire = JSON.stringify({ collection: w.collection, id: w.id, data: w.data });
      for (const secret of [ip, uid, "support-post", "support-ticket", "ip:", "user:"]) {
        assert.ok(!wire.includes(secret), `stored data must not contain ${secret}`);
      }
    }
  });

  it("sets expiresAt to the window end so documents can be expired later", async () => {
    await checkRateLimit({ key: "expiry:1", max: 5, windowMs: 90_000 }, store.asFirestore());
    const doc = store.docs.get(hashKey("expiry:1"));
    assert.ok(doc);
    assert.equal(doc.expiresAt, (doc.windowStart as number) + 90_000);
  });

  it("hashKey is a 64 character hex SHA-256 and does not echo its input", () => {
    const h = hashKey("ip:x:198.51.100.5");
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.ok(!h.includes("198.51.100.5"));
  });
});
