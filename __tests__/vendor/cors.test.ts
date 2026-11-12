import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { allowedOrigins, checkOrigin, corsHeaders } from "../../lib/vendor/cors";
import { VendorError, errorBody } from "../../lib/vendor/errors";

describe("CORS", () => {
  test("native apps (no Origin) are allowed without CORS headers", () => {
    const check = checkOrigin(null, allowedOrigins({ NODE_ENV: "production" }));
    assert.deepEqual(check, { kind: "none" });
    assert.equal(corsHeaders(check)["Access-Control-Allow-Origin"], undefined);
  });

  test("configured origins are allowed and echoed, never *", () => {
    const allowed = allowedOrigins({ VENDOR_WEB_ORIGINS: "https://vendor.glowvai.in/, https://Partners.glowvai.in, not a url", NODE_ENV: "production" });
    assert.deepEqual(allowed, ["https://glowvai.in", "https://www.glowvai.in", "https://vendor.glowvai.in", "https://partners.glowvai.in"]);
    const h = corsHeaders(checkOrigin("https://vendor.glowvai.in", allowed));
    assert.equal(h["Access-Control-Allow-Origin"], "https://vendor.glowvai.in");
    assert.equal(h["Access-Control-Allow-Credentials"], undefined);
    assert.equal(checkOrigin("https://evil.example", allowed).kind, "denied");
  });

  test("the site's own origins are allowed with no env var set", () => {
    const prod = { NODE_ENV: "production" };
    for (const origin of ["https://glowvai.in", "https://www.glowvai.in"]) {
      const h = corsHeaders(checkOrigin(origin, allowedOrigins(prod)));
      assert.equal(h["Access-Control-Allow-Origin"], origin);
    }
    assert.equal(checkOrigin("https://glowvai.in.evil.example", allowedOrigins(prod)).kind, "denied");
    assert.equal(checkOrigin("http://glowvai.in", allowedOrigins(prod)).kind, "denied");
  });

  test("NEXT_PUBLIC_SITE_URL adds its origin (path and trailing slash dropped)", () => {
    const allowed = allowedOrigins({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://staging.glowvai.in/some/path/" });
    assert.ok(allowed.includes("https://staging.glowvai.in"));
    assert.equal(checkOrigin("https://staging.glowvai.in", allowed).kind, "allowed");
    assert.ok(allowed.includes("https://glowvai.in"));
  });

  test("a broken NEXT_PUBLIC_SITE_URL is ignored, not thrown", () => {
    const allowed = allowedOrigins({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "not a url" });
    assert.deepEqual(allowed, ["https://glowvai.in", "https://www.glowvai.in"]);
  });

  test("VENDOR_WEB_ORIGINS still extends the site origins", () => {
    const allowed = allowedOrigins({ NODE_ENV: "production", VENDOR_WEB_ORIGINS: "https://partners.example" });
    assert.equal(checkOrigin("https://partners.example", allowed).kind, "allowed");
    assert.equal(checkOrigin("https://www.glowvai.in", allowed).kind, "allowed");
  });

  test("localhost dev origins only outside production", () => {
    assert.ok(allowedOrigins({ NODE_ENV: "development" }).includes("http://localhost:8081"));
    assert.ok(allowedOrigins({ NODE_ENV: "development" }).includes("http://localhost:19006"));
    assert.equal(checkOrigin("http://localhost:8081", allowedOrigins({ NODE_ENV: "production" })).kind, "denied");
  });
});

describe("error body", () => {
  test("always { ok:false, error, code } and extras cannot override them", () => {
    const body = errorBody(new VendorError("OUT_OF_STOCK", 409, undefined, { missing: [{ productId: "p1" }], ok: true, code: "X" }));
    assert.equal(body.ok, false);
    assert.equal(body.code, "OUT_OF_STOCK");
    assert.equal(typeof body.error, "string");
    assert.deepEqual(body.missing, [{ productId: "p1" }]);
  });
});
