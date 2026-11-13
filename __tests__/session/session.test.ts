// Tests for lib/session-token.ts (and the no-fallback rule for lib/session.ts). No network. The secret is set in
// process.env per test and restored afterwards. The secret values here are test-only and never written to a file.
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSessionToken, SessionConfigError, verifySessionToken } from "../../lib/session-token";

const VALID_SECRET = "test-only-session-secret-0123456789abcdef";
const OTHER_SECRET = "another-test-only-secret-value-0123456789";
const SHORT_SECRET = "too-short-0123456789";
const SOURCE = ["session.ts", "session-token.ts"]
  .map((f) => readFileSync(join(process.cwd(), "lib", f), "utf8"))
  .join("\n");

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
});

afterEach(() => {
  if (saved === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = saved;
});

describe("no hard-coded fallback", () => {
  it("the source has no default secret value and SESSION_SECRET never falls back to a literal", () => {
    assert.ok(!SOURCE.includes("glow-vai-default"), "the old default secret must not appear in the source");
    // An empty fallback (?? "") is allowed: the length check after it refuses it. A non-empty literal fallback is not.
    assert.ok(!/SESSION_SECRET\s*(\|\||\?\?)\s*["'`][^"'`]+["'`]/.test(SOURCE), "SESSION_SECRET must not fall back to a non-empty literal");
    assert.ok(!/(secret|key)\s*=\s*["'`][^"'`]+["'`]/i.test(SOURCE), "no secret or key may be assigned a string literal");
  });
});

describe("secret requirements", () => {
  it("refuses to create a token when SESSION_SECRET is missing", () => {
    assert.throws(() => createSessionToken("s-1"), SessionConfigError);
  });

  it("refuses to create a token when SESSION_SECRET is shorter than 32 characters", () => {
    process.env.SESSION_SECRET = SHORT_SECRET;
    assert.throws(() => createSessionToken("s-1"), SessionConfigError);
  });

  it("refuses to verify, even a well-formed token, when SESSION_SECRET is missing or short", () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const token = createSessionToken("s-1");
    delete process.env.SESSION_SECRET;
    assert.throws(() => verifySessionToken(token), SessionConfigError);
    process.env.SESSION_SECRET = SHORT_SECRET;
    assert.throws(() => verifySessionToken(token), SessionConfigError);
  });

  it("the error names the setting only and carries no session id or secret value", () => {
    process.env.SESSION_SECRET = SHORT_SECRET;
    assert.throws(
      () => createSessionToken("sess-PII-marker-42"),
      (err: unknown) => {
        assert.ok(err instanceof SessionConfigError);
        assert.match(err.message, /SESSION_SECRET/);
        assert.ok(!err.message.includes("sess-PII-marker-42"));
        assert.ok(!err.message.includes(SHORT_SECRET));
        return true;
      },
    );
  });

  it("a valid 32+ character secret works: a fresh token verifies to its session id", () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const token = createSessionToken("sess-abc");
    assert.deepEqual(verifySessionToken(token), { valid: true, sessionId: "sess-abc" });
  });

  it("a token signed with another secret is rejected", () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const token = createSessionToken("sess-abc");
    process.env.SESSION_SECRET = OTHER_SECRET;
    assert.deepEqual(verifySessionToken(token), { valid: false });
  });

  it("a tampered token is rejected", () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const token = createSessionToken("sess-abc");
    const [sessionId, expiresAt, signature] = token.split(":");
    const flipped = (signature[0] === "a" ? "b" : "a") + signature.slice(1);
    assert.deepEqual(verifySessionToken(`${sessionId}:${expiresAt}:${flipped}`), { valid: false });
    assert.deepEqual(verifySessionToken(`sess-evil:${expiresAt}:${signature}`), { valid: false });
    assert.deepEqual(verifySessionToken(`${sessionId}:${Number(expiresAt) + 1000}:${signature}`), { valid: false });
    assert.deepEqual(verifySessionToken(""), { valid: false });
    assert.deepEqual(verifySessionToken("not-a-token"), { valid: false });
  });

  it("an expired token with a correct signature is rejected", () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const payload = `sess-old:${Date.now() - 1000}`;
    const sig = createHmac("sha256", VALID_SECRET).update(payload).digest("hex");
    assert.deepEqual(verifySessionToken(`${payload}:${sig}`), { valid: false });
  });
});
