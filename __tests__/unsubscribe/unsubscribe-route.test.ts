// Tests for app/api/unsubscribe: only the signed token from an email can unsubscribe, never a bare email address.
// No network and no real sheet: SHEETS_WEBAPP_URL points at a local HTTP server that records the calls. The secret is
// test-only and lives in process.env for this file only.
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";

type UnsubRoute = typeof import("../../app/api/unsubscribe/route");
type Tokens = typeof import("../../lib/email/tokens");

const SECRET = "test-only-unsubscribe-secret-0123456789abcdef";
const VICTIM = "victim@example.com";
const OWNER = "owner@example.com";

const sheetCalls: { tab?: string; action?: string; data?: { email?: string } }[] = [];
let sheet: Server;
let route: UnsubRoute;
let tokens: Tokens;
let savedWebapp: string | undefined;
let savedSecret: string | undefined;
let ipCounter = 0;

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
  savedSecret = process.env.UNSUBSCRIBE_SECRET;
  // Must be set before the modules load: lib/env.ts reads them at import time.
  process.env.SHEETS_WEBAPP_URL = `http://127.0.0.1:${port}/exec`;
  process.env.UNSUBSCRIBE_SECRET = SECRET;

  route = await import("../../app/api/unsubscribe/route");
  tokens = await import("../../lib/email/tokens");
});

after(async () => {
  await new Promise<void>((resolve) => sheet.close(() => resolve()));
  if (savedWebapp === undefined) delete process.env.SHEETS_WEBAPP_URL;
  else process.env.SHEETS_WEBAPP_URL = savedWebapp;
  if (savedSecret === undefined) delete process.env.UNSUBSCRIBE_SECRET;
  else process.env.UNSUBSCRIBE_SECRET = savedSecret;
});

beforeEach(() => {
  sheetCalls.length = 0;
});

// A fresh IP per request so the per-IP limit never interferes, except in the rate limit test.
function nextIp() {
  ipCounter += 1;
  return `10.50.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

function post(body: string, contentType: string, query = "", ip = nextIp()) {
  return new NextRequest(`http://127.0.0.1/api/unsubscribe${query}`, {
    method: "POST",
    headers: { "content-type": contentType, "x-forwarded-for": ip },
    body,
  });
}

function get(query: string, accept = "application/json", ip = nextIp()) {
  return new NextRequest(`http://127.0.0.1/api/unsubscribe${query}`, {
    method: "GET",
    headers: { accept, "x-forwarded-for": ip },
  });
}

const suppressedEmails = () => sheetCalls.filter((c) => c.tab === "Suppressions").map((c) => c.data?.email);

describe("POST /api/unsubscribe: a signed token is required", () => {
  it("refuses a bare email address in JSON", async () => {
    const res = await route.POST(post(JSON.stringify({ email: VICTIM }), "application/json"));
    assert.equal(res.status, 400);
    assert.equal(sheetCalls.length, 0, "nothing is written");
  });

  it("refuses a bare email address in a form post", async () => {
    const res = await route.POST(post(`email=${encodeURIComponent(VICTIM)}`, "application/x-www-form-urlencoded"));
    assert.equal(res.status, 400);
    assert.equal(sheetCalls.length, 0);
  });

  it("refuses a forged token", async () => {
    const forged = Buffer.from(`${VICTIM}:marketing:${Date.now()}:${"0".repeat(64)}`).toString("base64url");
    const res = await route.POST(post(JSON.stringify({ token: forged }), "application/json"));
    assert.equal(res.status, 400);
    assert.equal(sheetCalls.length, 0);
  });

  it("unsubscribes only the token's address, ignoring an email sent alongside it", async () => {
    const token = tokens.createUnsubscribeToken(OWNER);
    const res = await route.POST(post(JSON.stringify({ token, email: VICTIM }), "application/json"));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
    assert.deepEqual(suppressedEmails(), [OWNER]);
  });

  it("works for the RFC 8058 one-click POST (token in the query string)", async () => {
    const token = tokens.createUnsubscribeToken(OWNER);
    const res = await route.POST(post("List-Unsubscribe=One-Click", "application/x-www-form-urlencoded", `?token=${token}`));
    assert.equal(res.status, 200);
    assert.deepEqual(suppressedEmails(), [OWNER]);
  });

  it("is limited per IP", async () => {
    const ip = "10.60.0.1";
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await route.POST(post("{}", "application/json", "", ip))).status;
    assert.equal(last, 429);
  });
});

describe("GET /api/unsubscribe", () => {
  it("returns the email for a valid token", async () => {
    const token = tokens.createUnsubscribeToken(OWNER);
    const res = await route.GET(get(`?token=${token}`));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).email, OWNER);
    assert.equal(sheetCalls.length, 0, "a GET never unsubscribes");
  });

  it("no longer echoes a bare email address", async () => {
    const res = await route.GET(get(`?email=${encodeURIComponent(VICTIM)}`));
    assert.equal(res.status, 400);
  });

  it("sends a browser to the unsubscribe page, keeping the token", async () => {
    const token = tokens.createUnsubscribeToken(OWNER);
    const res = await route.GET(get(`?token=${token}`, "text/html,application/xhtml+xml"));
    assert.equal(res.status, 303);
    const location = new URL(res.headers.get("location") || "");
    assert.equal(location.pathname, "/unsubscribe");
    assert.equal(location.searchParams.get("token"), token);
  });

  it("is limited per IP", async () => {
    const ip = "10.60.0.2";
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await route.GET(get("", "application/json", ip))).status;
    assert.equal(last, 429);
  });
});

describe("routes that read the request are dynamic, not rendered once at build time", () => {
  for (const file of ["app/api/unsubscribe/route.ts", "app/api/newsletter/route.ts", "app/api/cron/weekly-digest/route.ts"]) {
    it(file, () => {
      const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      assert.match(source, /export const dynamic = "force-dynamic";/);
      assert.doesNotMatch(source, /force-static/);
    });
  }
});
