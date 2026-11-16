import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COOLDOWN_SECONDS, MAX_VERIFY_ATTEMPTS, OTP_LIMITS, codeHash, cooldownLeft, dailyCap, generateCode, hashesMatch,
  judgeAttempt, maskPhone, newChallenge, normalisePhone, phoneHash,
} from "../../lib/otp/rules";
import { httpSmsConfig, mapStatus, sendSms } from "../../lib/otp/httpsms";

const S = "secret-secret-secret";
const P = "+919876543210";
const NOW = 1_800_000_000_000;
const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");

describe("phone and code helpers", () => {
  test("normalises Indian mobiles and rejects others", () => {
    for (const ok of ["9876543210", "+91 98765 43210", "919876543210"]) assert.equal(normalisePhone(ok), P);
    for (const bad of ["5876543210", "98765", "+14155550123", "", null, 12]) assert.equal(normalisePhone(bad), null);
  });
  test("codes are 6 digits", () => {
    for (let i = 0; i < 200; i++) assert.match(generateCode(), /^\d{6}$/);
  });
  test("hashes are keyed, bound to the phone, and never contain the code", () => {
    const h = codeHash(P, "123456", S);
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.notEqual(h, codeHash(P, "123456", "other"));
    assert.notEqual(h, codeHash("+919876543211", "123456", S));
    assert.ok(!h.includes("123456"));
    assert.notEqual(phoneHash(P, S), codeHash(P, "123456", S));
    assert.ok(hashesMatch(h, h));
    assert.ok(!hashesMatch(h, codeHash(P, "123457", S)));
    assert.ok(!hashesMatch(h, "zz"));
  });
  test("masks the phone", () => {
    assert.ok(maskPhone(P).endsWith("3210"));
    assert.ok(!maskPhone(P).includes("98765"));
  });
  test("limits match the brief and the cap is configurable", () => {
    assert.equal(COOLDOWN_SECONDS, 30);
    assert.deepEqual(
      [OTP_LIMITS.phonePerHour.max, OTP_LIMITS.phonePerDay.max, OTP_LIMITS.ipPerHour.max, OTP_LIMITS.ipPerDay.max],
      [5, 10, 10, 30],
    );
    assert.equal(dailyCap(undefined), 300);
    assert.equal(dailyCap("50"), 50);
    assert.equal(dailyCap("-1"), 300);
    assert.equal(dailyCap("abc"), 300);
  });
  test("cooldown", () => {
    assert.equal(cooldownLeft(undefined, NOW), 0);
    assert.equal(cooldownLeft(NOW - 10_000, NOW), 20);
    assert.equal(cooldownLeft(NOW - 31_000, NOW), 0);
  });
});

describe("judging a verify attempt", () => {
  const good = codeHash(P, "111111", S);
  const bad = codeHash(P, "222222", S);
  test("missing, ok, wrong, expired, locked", () => {
    assert.equal(judgeAttempt(undefined, good, NOW).kind, "missing");
    const c = newChallenge(good, NOW);
    assert.equal(judgeAttempt(c, good, NOW + 1000).kind, "ok");
    assert.deepEqual(judgeAttempt(c, bad, NOW + 1000), { kind: "wrong", attemptsLeft: 4 });
    assert.equal(judgeAttempt(c, good, NOW + 5 * 60_000).kind, "expired");
    assert.equal(judgeAttempt({ ...c, attempts: MAX_VERIFY_ATTEMPTS }, good, NOW + 1000).kind, "locked");
    assert.deepEqual(judgeAttempt({ ...c, attempts: 4 }, bad, NOW + 1000), { kind: "wrong", attemptsLeft: 0 });
  });
});

describe("httpSMS client", () => {
  test("config needs key and from; base url defaults", () => {
    assert.equal(httpSmsConfig({}), null);
    assert.equal(httpSmsConfig({ HTTPSMS_API_KEY: "k" }), null);
    assert.deepEqual(httpSmsConfig({ HTTPSMS_API_KEY: "k", HTTPSMS_FROM: "+911" }), { apiKey: "k", from: "+911", baseUrl: "https://api.httpsms.com" });
    assert.equal(httpSmsConfig({ HTTPSMS_API_KEY: "k", HTTPSMS_FROM: "+911", HTTPSMS_BASE_URL: "https://x.test/" })?.baseUrl, "https://x.test");
  });
  test("status mapping", () => {
    assert.equal(mapStatus(401), "unauthorized");
    assert.equal(mapStatus(422), "rejected");
    assert.equal(mapStatus(500), "unavailable");
  });
  test("sends the documented request and maps failures", async () => {
    const cfg = { apiKey: "k", from: "+911", baseUrl: "https://x.test" };
    let seen: { url: string; init: RequestInit } | null = null;
    const okFetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    assert.deepEqual(await sendSms(cfg, P, "hi", okFetch), { ok: true });
    const got = seen as unknown as { url: string; init: RequestInit };
    assert.equal(got.url, "https://x.test/v1/messages/send");
    assert.equal((got.init.headers as Record<string, string>)["x-api-key"], "k");
    assert.deepEqual(JSON.parse(got.init.body as string), { content: "hi", from: "+911", to: P });
    const f = (s: number) => (async () => new Response("{}", { status: s })) as unknown as typeof fetch;
    assert.deepEqual(await sendSms(cfg, P, "hi", f(401)), { ok: false, reason: "unauthorized" });
    const boom = (async () => {
      throw new Error("net");
    }) as unknown as typeof fetch;
    assert.deepEqual(await sendSms(cfg, P, "hi", boom), { ok: false, reason: "unavailable" });
    const slow = (async (_u: string, init: RequestInit) =>
      new Promise((_r, rej) => init.signal!.addEventListener("abort", () => rej(init.signal!.reason)))) as unknown as typeof fetch;
    assert.deepEqual(await sendSms(cfg, P, "hi", slow, 20), { ok: false, reason: "timeout" });
  });
});

describe("routes and client", () => {
  test("request checks config, then IP limits before reading the body or sending", () => {
    const r = read("app/api/auth/otp/request/route.ts");
    assert.ok(r.indexOf("OTP_NOT_CONFIGURED") < r.indexOf("otp-req-ip-h"));
    assert.ok(r.indexOf("otp-req-ip-d") < r.indexOf("req.json()"));
    assert.ok(r.indexOf("otp-req-global") < r.indexOf("sendSms("));
    assert.ok(!/console\.\w+\([^)]*\bcode\b/.test(r));
  });
  test("verify is single use and never logs the code", () => {
    const v = read("app/api/auth/otp/verify/route.ts");
    assert.match(v, /tx\.delete\(ref\)/);
    assert.match(v, /getUserByPhoneNumber/);
    assert.match(v, /createCustomToken/);
    assert.ok(!/console\.\w+\([^)]*\bcode\b/.test(v));
  });
  test("client defaults to Firebase unless NEXT_PUBLIC_OTP_PROVIDER=httpsms", () => {
    const c = read("glowvai-app/features/auth/phoneSignIn.ts");
    assert.match(c, /NEXT_PUBLIC_OTP_PROVIDER === 'httpsms'/);
    assert.match(c, /signInWithCustomToken/);
  });
});
