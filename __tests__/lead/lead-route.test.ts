// Tests for app/api/lead (POST, PATCH) and app/api/lead/image (POST). No network and no real sheet: SHEETS_WEBAPP_URL points
// at a local HTTP server that records the calls. LEAD_ALERTS is off and no email is given, so nothing is queued to Resend.
// The secret values here are test-only and only ever live in process.env for the duration of a test.
import { after, before, beforeEach, afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createSessionToken } from "../../lib/session-token";
import { register } from "node:module";

// Swaps the email queue for a no-op before the route loads (see stub-hook.mjs).
register("./stub-hook.mjs", import.meta.url);

type LeadRoute = typeof import("../../app/api/lead/route");
type ImageRoute = typeof import("../../app/api/lead/image/route");

const VALID_SECRET = "test-only-session-secret-0123456789abcdef";
const SHORT_SECRET = "too-short-test-secret-0123";
const LEAD_NAME = "Asha Testperson";
const LEAD_PHONE = "9876543210";

const sheetCalls: Record<string, unknown>[] = [];
let sheet: Server;
let lead: LeadRoute;
let image: ImageRoute;
let savedSecret: string | undefined;
let savedWebapp: string | undefined;

before(async () => {
  sheet = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      sheetCalls.push(JSON.parse(raw));
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise<void>((resolve) => sheet.listen(0, "127.0.0.1", resolve));
  const port = (sheet.address() as AddressInfo).port;

  savedWebapp = process.env.SHEETS_WEBAPP_URL;
  savedSecret = process.env.SESSION_SECRET;
  // Must be set before the route modules load: lib/env.ts reads LEAD_ALERTS at import time.
  process.env.SHEETS_WEBAPP_URL = `http://127.0.0.1:${port}/exec`;
  process.env.LEAD_ALERTS = "false";

  lead = await import("../../app/api/lead/route");
  image = await import("../../app/api/lead/image/route");
});

after(async () => {
  await new Promise<void>((resolve) => sheet.close(() => resolve()));
  restoreEnv("SHEETS_WEBAPP_URL", savedWebapp);
  restoreEnv("SESSION_SECRET", savedSecret);
});

beforeEach(() => {
  sheetCalls.length = 0;
  delete process.env.SESSION_SECRET;
});

afterEach(() => {
  restoreEnv("SESSION_SECRET", savedSecret);
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function leadPost(ip: string, body: Record<string, unknown> = {}) {
  return new NextRequest("http://127.0.0.1/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, "user-agent": "test-agent" },
    body: JSON.stringify({
      name: LEAD_NAME,
      phone: LEAD_PHONE,
      consent: true,
      ageConfirmed: true,
      ...body,
    }),
  });
}

function leadPatch(cookieToken?: string) {
  return new NextRequest("http://127.0.0.1/api/lead", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookieToken ? { cookie: `gv_session=${cookieToken}` } : {}),
    },
    body: JSON.stringify({ overall_score: 80, sub_scores: { hydration: 70 }, skin_concern: "dryness" }),
  });
}

function imagePost(ip: string, cookieToken?: string, body: Record<string, unknown> = {}) {
  return new NextRequest("http://127.0.0.1/api/lead/image", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      ...(cookieToken ? { cookie: `gv_session=${cookieToken}` } : {}),
    },
    body: JSON.stringify({ image_base64: "aGVsbG8=", mime: "image/jpeg", ...body }),
  });
}

// Captures console.error and console.warn output for the duration of fn.
async function captureLogs<T>(fn: () => Promise<T>): Promise<{ result: T; logs: string }> {
  const lines: string[] = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  const record = (...args: unknown[]) => {
    lines.push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(" "));
  };
  console.error = record;
  console.warn = record;
  try {
    const result = await fn();
    return { result, logs: lines.join("\n") };
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
}

describe("POST /api/lead: lead saved, session cookie cannot be set", () => {
  it("still returns success with the session id when SESSION_SECRET is missing", async () => {
    const res = await lead.POST(leadPost("10.1.0.1"));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(typeof json.session_id, "string");
    assert.equal(json.sessionId, json.session_id);

    assert.equal(sheetCalls.length, 1, "the lead row must be written");
    assert.equal(sheetCalls[0].action, "create");
    assert.equal((sheetCalls[0].data as Record<string, unknown>).session_id, json.session_id);
    assert.equal(res.headers.get("set-cookie"), null, "no cookie is set when the secret is missing");
  });

  it("still returns success when SESSION_SECRET is shorter than 32 characters", async () => {
    process.env.SESSION_SECRET = SHORT_SECRET;
    const res = await lead.POST(leadPost("10.1.0.2"));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
    assert.equal(sheetCalls.length, 1);
  });

  it("logs the error class only: no name, phone, session id, IP or secret value", async () => {
    process.env.SESSION_SECRET = SHORT_SECRET;
    const { result: res, logs } = await captureLogs(() => lead.POST(leadPost("10.1.0.3")));
    const json = await res.json();

    assert.match(logs, /SessionConfigError/, "the error class is logged");
    assert.match(logs, /PII omitted/);
    assert.ok(!logs.includes(LEAD_NAME), "name must not be logged");
    assert.ok(!logs.includes(LEAD_PHONE), "phone must not be logged");
    assert.ok(!logs.includes(json.session_id), "session id must not be logged");
    assert.ok(!logs.includes("10.1.0.3"), "IP must not be logged");
    assert.ok(!logs.includes(SHORT_SECRET), "secret value must not be logged");
    assert.ok(!logs.includes("test-agent"), "user agent must not be logged");
  });
});

describe("PATCH /api/lead: session checks", () => {
  it("returns 401 with no cookie", async () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const res = await lead.PATCH(leadPatch());
    assert.equal(res.status, 401);
    assert.match((await res.json()).error, /session/i);
    assert.equal(sheetCalls.length, 0);
  });

  it("returns 401, not 500, when SESSION_SECRET is missing and a cookie is sent", async () => {
    const { result: res } = await captureLogs(() => lead.PATCH(leadPatch("sess-1:99999999999999:abcd")));
    assert.equal(res.status, 401);
    assert.match((await res.json()).error, /session/i);
    assert.equal(sheetCalls.length, 0);
  });

  it("returns 401, not 500, when SESSION_SECRET is shorter than 32 characters", async () => {
    process.env.SESSION_SECRET = SHORT_SECRET;
    const { result: res } = await captureLogs(() => lead.PATCH(leadPatch("sess-1:99999999999999:abcd")));
    assert.equal(res.status, 401);
    assert.equal(sheetCalls.length, 0);
  });

  it("returns 401 for a token signed with another secret", async () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const forged = createSessionToken("sess-forged");
    process.env.SESSION_SECRET = "another-test-only-secret-value-0123456789";
    const res = await lead.PATCH(leadPatch(forged));
    assert.equal(res.status, 401);
    assert.equal(sheetCalls.length, 0);
  });

  it("completes the lead for a valid session", async () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const token = createSessionToken("sess-valid-1");
    const res = await lead.PATCH(leadPatch(token));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
    assert.equal(sheetCalls.length, 1);
    assert.equal(sheetCalls[0].action, "complete");
    assert.equal(sheetCalls[0].session_id, "sess-valid-1");
  });
});

describe("POST /api/lead/image: secret handling", () => {
  it("returns 503 with a clear message when SESSION_SECRET is missing", async () => {
    const { result: res, logs } = await captureLogs(() => image.POST(imagePost("10.2.0.1")));
    assert.equal(res.status, 503);
    const json = await res.json();
    assert.match(json.error, /unavailable/i);
    assert.match(json.error, /session configuration/i);
    assert.equal(sheetCalls.length, 0, "no upload is sent without a secret");
    assert.ok(!logs.includes(LEAD_NAME));
  });

  it("returns 503 when SESSION_SECRET is shorter than 32 characters", async () => {
    process.env.SESSION_SECRET = SHORT_SECRET;
    const { result: res } = await captureLogs(() => image.POST(imagePost("10.2.0.2")));
    assert.equal(res.status, 503);
    assert.equal(sheetCalls.length, 0);
  });

  it("uploads for a valid session as before, using the verified session id", async () => {
    process.env.SESSION_SECRET = VALID_SECRET;
    const token = createSessionToken("sess-img-1");
    const res = await image.POST(imagePost("10.2.0.3", token, { session_id: "from-body" }));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(sheetCalls.length, 1);
    assert.equal(sheetCalls[0].action, "upload_image");
    assert.equal(sheetCalls[0].session_id, "sess-img-1");
    assert.equal(sheetCalls[0].mime, "image/jpeg");
  });
});
