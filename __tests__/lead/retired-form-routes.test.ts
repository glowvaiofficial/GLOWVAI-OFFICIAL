// The old public form routes are retired (lib/http/retired.ts): nothing calls them, so each answers 410 Gone before it
// saves anything or queues an email. No network and no real sheet: SHEETS_WEBAPP_URL points at a local HTTP server that
// records any call, and the email queue is a stub (see stub-hook.mjs). The secret values are test-only.
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createSessionToken } from "../../lib/session-token";
import { register } from "node:module";

// Swaps the email queue for a no-op before the routes load (see stub-hook.mjs).
register("./stub-hook.mjs", import.meta.url);

type Handler = (req: NextRequest) => Promise<Response>;

const VALID_SECRET = "test-only-session-secret-0123456789abcdef";

const sheetCalls: unknown[] = [];
let sheet: Server;
let queued: unknown[];
let savedSecret: string | undefined;
let savedWebapp: string | undefined;
let savedUnsub: string | undefined;
const routes: Record<string, Handler> = {};

before(async () => {
  sheet = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      sheetCalls.push(raw);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise<void>((resolve) => sheet.listen(0, "127.0.0.1", resolve));
  const port = (sheet.address() as AddressInfo).port;

  savedWebapp = process.env.SHEETS_WEBAPP_URL;
  savedSecret = process.env.SESSION_SECRET;
  savedUnsub = process.env.UNSUBSCRIBE_SECRET;
  // Must be set before the route modules load: lib/env.ts reads them at import time.
  process.env.SHEETS_WEBAPP_URL = `http://127.0.0.1:${port}/exec`;
  process.env.LEAD_ALERTS = "false";
  process.env.SESSION_SECRET = VALID_SECRET;
  process.env.UNSUBSCRIBE_SECRET = "test-only-unsubscribe-secret-0123456789abcdef";

  const lead = await import("../../app/api/lead/route");
  routes["POST /api/lead"] = lead.POST;
  routes["PATCH /api/lead"] = lead.PATCH;
  routes["POST /api/lead/image"] = (await import("../../app/api/lead/image/route")).POST;
  routes["POST /api/contact"] = (await import("../../app/api/contact/route")).POST;
  routes["POST /api/data-request"] = (await import("../../app/api/data-request/route")).POST;
  routes["POST /api/feedback"] = (await import("../../app/api/feedback/route")).POST;
  routes["POST /api/newsletter"] = (await import("../../app/api/newsletter/route")).POST;
  routes["POST /api/order-intent"] = (await import("../../app/api/order-intent/route")).POST;
  routes["POST /api/waitlist"] = (await import("../../app/api/waitlist/route")).POST;
  queued = (await import("./email-send-stub")).queued;
});

after(async () => {
  await new Promise<void>((resolve) => sheet.close(() => resolve()));
  restoreEnv("SHEETS_WEBAPP_URL", savedWebapp);
  restoreEnv("SESSION_SECRET", savedSecret);
  restoreEnv("UNSUBSCRIBE_SECRET", savedUnsub);
});

beforeEach(() => {
  sheetCalls.length = 0;
  queued.length = 0;
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

// A well-formed request for every form, with a valid scan session cookie, so only the retirement check can refuse it.
function formRequest(method: string, path: string) {
  return new NextRequest(`http://127.0.0.1${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "10.9.0.1",
      cookie: `gv_session=${createSessionToken("sess-retired")}`,
    },
    body: JSON.stringify({
      name: "Asha Testperson",
      phone: "9876543210",
      email: "asha@example.com",
      message: "Hello there, this is a test message.",
      consent: true,
      ageConfirmed: true,
      overall_score: 80,
      sub_scores: { hydration: 70 },
      image_base64: "aGVsbG8=",
      mime: "image/jpeg",
    }),
  });
}

describe("retired public form routes answer 410 Gone and do no work", () => {
  const names = [
    "POST /api/lead",
    "PATCH /api/lead",
    "POST /api/lead/image",
    "POST /api/contact",
    "POST /api/data-request",
    "POST /api/feedback",
    "POST /api/newsletter",
    "POST /api/order-intent",
    "POST /api/waitlist",
  ];
  for (const name of names) {
    it(name, async () => {
      const [method, path] = name.split(" ");
      const res = await routes[name](formRequest(method, path));
      assert.equal(res.status, 410);
      const json = await res.json();
      assert.equal(json.ok, false);
      assert.match(json.error, /no longer available/i);
      assert.equal(res.headers.get("set-cookie"), null, "no session cookie is set");
      assert.equal(sheetCalls.length, 0, "nothing is written to the sheet");
      assert.equal(queued.length, 0, "no email is queued");
    });
  }
});
