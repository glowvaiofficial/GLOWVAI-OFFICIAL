// The backend rules (docs/BACKEND-RULES.md), checked against the route files. No network, no Firebase: the files are read as
// text. A new route that skips the rate limit, or is missing from the route table, fails here.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const API = join(ROOT, "app", "api");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === "route.ts" ? [full] : [];
  });
}

const files = routeFiles(API);
const pathOf = (file: string) => "/api/" + relative(API, file).split(sep).slice(0, -1).join("/");
const read = (file: string) => readFileSync(file, "utf8");
const byPath = (p: string) => read(join(API, ...p.replace("/api/", "").split("/"), "route.ts"));

// A route names its limiter with one of these, or it goes through a wrapper that always limits.
const LIMITERS = /limitByIp\(|limitByIpShared\(|limitByUser\(|limitByUserShared\(|checkShared\(|rateLimit\(|overLimit\(|vendorRoute[<(]|riderRoute[<(]|gate\(|limited\(|tooMany\(/;

// Routes allowed to have no limiter, and why.
const SECRET_ONLY: Record<string, string> = {
  "/api/cron/rate-limits": "CRON_SECRET bearer",
  "/api/cron/subscriptions": "CRON_SECRET bearer",
  "/api/cron/weekly-digest": "CRON_SECRET bearer",
};
// Retired form routes answer 410 before any work.
const RETIRED = /RETIRED_FORM_ROUTES\) return retiredRoute\(\)/;

describe("every route has a limiter, a secret, or is retired", () => {
  it("finds the routes", () => assert.ok(files.length > 100));
  for (const file of files) {
    const p = pathOf(file);
    it(p, () => {
      const src = read(file);
      if (p in SECRET_ONLY) {
        assert.match(src, /CRON_SECRET|cronSecret/, `${p} must check the cron secret`);
        return;
      }
      assert.ok(LIMITERS.test(src) || RETIRED.test(src), `${p} needs a rate limit (see docs/BACKEND-RULES.md section 1)`);
    });
  }
});

describe("docs/BACKEND-RULES.md lists every route", () => {
  const doc = readFileSync(join(ROOT, "docs", "BACKEND-RULES.md"), "utf8");
  for (const file of files) {
    const p = pathOf(file);
    it(p, () => assert.ok(doc.includes("`" + p + "`"), `${p} is missing from the route table in docs/BACKEND-RULES.md`));
  }
});

describe("19 Nov 2026 fixes", () => {
  it("resend webhook limits per IP first, is dynamic and caps its dedupe set", () => {
    const src = byPath("/api/webhooks/resend");
    assert.match(src, /export const dynamic = "force-dynamic"/);
    const post = src.slice(src.indexOf("export async function POST"));
    assert.ok(post.indexOf("rateLimit(`resend-webhook:") >= 0);
    assert.ok(post.indexOf("rateLimit(`resend-webhook:") < post.indexOf("req.text()"), "limit comes before the body is read");
    assert.match(src, /processedEvents\.size > 5000/);
  });
  it("returns POST daily cap uses the shared limiter", () => {
    assert.match(byPath("/api/shop/returns"), /await limitByUserShared\(customer\.uid, "returns-post", 5, DAY_MS/);
  });
  it("affiliate apply per-user daily cap uses the shared limiter", () => {
    assert.match(byPath("/api/shop/affiliate"), /await limitByUserShared\(customer\.uid, "affiliate-apply"/);
  });
  it("referral apply per-IP daily cap uses the shared limiter", () => {
    assert.match(byPath("/api/shop/referral/apply"), /await limitByIpShared\(req, "referral-apply"/);
  });
  it("SMS cost routes keep their caps (OTP_LIMITS)", async () => {
    const { OTP_LIMITS } = await import("../../lib/otp/rules");
    assert.equal(OTP_LIMITS.defaultDailyCap, 300);
    assert.deepEqual(OTP_LIMITS.phonePerHour, { max: 5, windowMs: 3_600_000 });
    assert.deepEqual(OTP_LIMITS.phonePerDay, { max: 10, windowMs: 86_400_000 });
    const src = byPath("/api/auth/otp/request");
    assert.match(src, /dailyCap\(process\.env\.OTP_DAILY_CAP\)/);
  });
});
