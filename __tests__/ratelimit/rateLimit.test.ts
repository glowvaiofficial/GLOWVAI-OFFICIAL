// Tests for lib/shop/rateLimit.ts. No network: fetch is stubbed for every shared-limiter call.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { checkRateLimit, hashKey, memoryCheck } from "../../lib/shop/rateLimit";

const URL_ENV = "https://example-upstash.invalid";
const TOKEN_ENV = "test-token-not-real";

type Call = { url: string; init: RequestInit };

let savedUrl: string | undefined;
let savedToken: string | undefined;
let calls: Call[];
let originalFetch: typeof globalThis.fetch;

function setUpstashEnv(on: boolean) {
  if (on) {
    process.env.UPSTASH_REDIS_REST_URL = URL_ENV;
    process.env.UPSTASH_REDIS_REST_TOKEN = TOKEN_ENV;
  } else {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
}

// Stubs fetch with a pipeline reply: INCR returns `count`, EXPIRE returns 1.
function stubPipeline(count: number) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify([{ result: count }, { result: 1 }]), { status: 200 });
  }) as typeof globalThis.fetch;
}

beforeEach(() => {
  savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  calls = [];
  originalFetch = globalThis.fetch;
  setUpstashEnv(false);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
  if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  mock.restoreAll();
});

describe("backend selection", () => {
  it("uses the in-memory limiter and never calls fetch when Upstash is not configured", async () => {
    globalThis.fetch = (async () => {
      throw new Error("fetch must not be called");
    }) as typeof globalThis.fetch;
    const r = await checkRateLimit({ key: "sel:none:1", max: 2, windowMs: 60_000 });
    assert.equal(r.allowed, true);
    assert.equal(r.remaining, 1);
  });

  it("uses the in-memory limiter when only one of the two Upstash variables is set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = URL_ENV;
    stubPipeline(1);
    const r = await checkRateLimit({ key: "sel:half:1", max: 2, windowMs: 60_000 });
    assert.equal(r.allowed, true);
    assert.equal(calls.length, 0);
  });

  it("calls the Upstash pipeline endpoint with the bearer token when both variables are set", async () => {
    setUpstashEnv(true);
    stubPipeline(1);
    await checkRateLimit({ key: "sel:shared:1", max: 5, windowMs: 60_000 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${URL_ENV}/pipeline`);
    assert.equal(calls[0].init.method, "POST");
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, `Bearer ${TOKEN_ENV}`);
    const commands = JSON.parse(String(calls[0].init.body));
    assert.equal(commands[0][0], "INCR");
    assert.equal(commands[1][0], "EXPIRE");
    assert.equal(commands[0][1], commands[1][1], "INCR and EXPIRE act on the same key");
  });
});

describe("window and remaining maths", () => {
  it("counts from the shared INCR result: allowed with remaining = max - count", async () => {
    setUpstashEnv(true);
    stubPipeline(2);
    const r = await checkRateLimit({ key: "maths:shared:ok", max: 5, windowMs: 60_000 });
    assert.deepEqual(r, { allowed: true, remaining: 3, retryAfterSeconds: 0 });
  });

  it("allows the request that reaches the max exactly and refuses the next one", async () => {
    setUpstashEnv(true);
    stubPipeline(5);
    const atMax = await checkRateLimit({ key: "maths:shared:edge", max: 5, windowMs: 60_000 });
    assert.equal(atMax.allowed, true);
    assert.equal(atMax.remaining, 0);
    stubPipeline(6);
    const over = await checkRateLimit({ key: "maths:shared:edge", max: 5, windowMs: 60_000 });
    assert.equal(over.allowed, false);
    assert.equal(over.remaining, 0);
  });

  it("gives retryAfterSeconds as the seconds left in the current fixed window", async (t) => {
    setUpstashEnv(true);
    const windowMs = 3_600_000;
    // 10 full windows, then 1,000,000 ms into the eleventh: 2,600,000 ms (2,600 s) of the window remain.
    const now = 10 * windowMs + 1_000_000;
    t.mock.method(Date, "now", () => now);
    stubPipeline(7);
    const r = await checkRateLimit({ key: "maths:shared:retry", max: 5, windowMs });
    assert.equal(r.allowed, false);
    assert.equal(r.retryAfterSeconds, 2600);
  });

  it("keys the window by its start, so a new window starts a fresh count", async (t) => {
    setUpstashEnv(true);
    const windowMs = 60_000;
    let clock = 5 * windowMs + 1;
    t.mock.method(Date, "now", () => clock);
    stubPipeline(1);
    await checkRateLimit({ key: "maths:window", max: 5, windowMs });
    clock = 6 * windowMs + 1;
    stubPipeline(1);
    await checkRateLimit({ key: "maths:window", max: 5, windowMs });
    const first = String(JSON.parse(String(calls[0].init.body))[0][1]);
    const second = String(JSON.parse(String(calls[1].init.body))[0][1]);
    assert.notEqual(first, second);
  });

  it("in-memory: refuses past the max, reports remaining and a retryAfter from the oldest hit", () => {
    const key = "maths:memory:1";
    const t0 = 1_000_000;
    assert.deepEqual(memoryCheck(key, 3, 60_000, t0), { allowed: true, remaining: 2, retryAfterSeconds: 0 });
    assert.deepEqual(memoryCheck(key, 3, 60_000, t0 + 1), { allowed: true, remaining: 1, retryAfterSeconds: 0 });
    assert.deepEqual(memoryCheck(key, 3, 60_000, t0 + 2), { allowed: true, remaining: 0, retryAfterSeconds: 0 });
    // 10 s later the oldest hit is still 50 s from expiring.
    assert.deepEqual(memoryCheck(key, 3, 60_000, t0 + 10_000), { allowed: false, remaining: 0, retryAfterSeconds: 50 });
    // Once the oldest hit has aged out, one slot is free again.
    assert.equal(memoryCheck(key, 3, 60_000, t0 + 60_001).allowed, true);
  });
});

describe("fail open and fallback", () => {
  it("falls back to the in-memory limiter when fetch throws, and still enforces the limit there", async (t) => {
    setUpstashEnv(true);
    const warn = t.mock.method(console, "warn", () => {});
    globalThis.fetch = (async () => {
      throw new TypeError("network down");
    }) as typeof globalThis.fetch;
    const key = "failopen:throw:1";
    const first = await checkRateLimit({ key, max: 1, windowMs: 60_000 });
    assert.equal(first.allowed, true, "an Upstash error does not refuse the request");
    const second = await checkRateLimit({ key, max: 1, windowMs: 60_000 });
    assert.equal(second.allowed, false, "the in-memory limiter still counts");
    assert.equal(warn.mock.callCount(), 2);
  });

  it("falls back on a non-2xx reply and on an error element in the pipeline result", async (t) => {
    setUpstashEnv(true);
    t.mock.method(console, "warn", () => {});
    globalThis.fetch = (async () => new Response("nope", { status: 503 })) as typeof globalThis.fetch;
    const a = await checkRateLimit({ key: "failopen:status:1", max: 5, windowMs: 60_000 });
    assert.equal(a.allowed, true);
    globalThis.fetch = (async () => new Response(JSON.stringify([{ error: "WRONGTYPE" }, { result: 1 }]), { status: 200 })) as typeof globalThis.fetch;
    const b = await checkRateLimit({ key: "failopen:error:1", max: 5, windowMs: 60_000 });
    assert.equal(b.allowed, true);
  });

  it("gives up after 2 seconds and falls back when Upstash never answers", async (t) => {
    setUpstashEnv(true);
    t.mock.method(console, "warn", () => {});
    globalThis.fetch = ((_url: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      })) as typeof globalThis.fetch;
    const started = Date.now();
    const r = await checkRateLimit({ key: "failopen:timeout:1", max: 5, windowMs: 60_000 });
    const took = Date.now() - started;
    assert.equal(r.allowed, true);
    assert.ok(took >= 1900 && took < 3000, `expected about 2 s, took ${took} ms`);
  });

  it("logs the failure without the key, the IP or the uid", async (t) => {
    setUpstashEnv(true);
    const warn = t.mock.method(console, "warn", () => {});
    globalThis.fetch = (async () => {
      throw new TypeError("boom");
    }) as typeof globalThis.fetch;
    await checkRateLimit({ key: "ip:orders-post:203.0.113.99", max: 5, windowMs: 60_000 });
    const logged = warn.mock.calls.map((c) => String(c.arguments[0])).join("\n");
    assert.ok(logged.includes("ratelimit"));
    assert.ok(!logged.includes("203.0.113.99"));
    assert.ok(!logged.includes("orders-post"));
  });
});

describe("hashed keys", () => {
  it("never sends a raw IP address or uid to Upstash, only SHA-256 of the key", async () => {
    setUpstashEnv(true);
    stubPipeline(1);
    const ip = "203.0.113.77";
    const uid = "uid-ABC123xyz";
    await checkRateLimit({ key: `ip:orders-post:${ip}`, max: 60, windowMs: 3_600_000 });
    await checkRateLimit({ key: `user:orders-post:${uid}`, max: 20, windowMs: 3_600_000 });
    assert.equal(calls.length, 2);
    for (const c of calls) {
      const wire = `${c.url} ${JSON.stringify(c.init.body)}`;
      assert.ok(!wire.includes(ip), "raw IP must not be sent");
      assert.ok(!wire.includes(uid), "raw uid must not be sent");
      assert.ok(!wire.includes("orders-post"), "route name is part of the hashed key only");
    }
    const hash = createHash("sha256").update(`ip:orders-post:${ip}`).digest("hex");
    assert.ok(String(calls[0].init.body).includes(hash), "the key is the SHA-256 of the logical key");
  });

  it("hashKey is a 64 character hex SHA-256 and does not echo its input", () => {
    const h = hashKey("ip:x:198.51.100.5");
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.ok(!h.includes("198.51.100.5"));
  });
});
