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
    assert.deepEqual(allowed, ["https://vendor.glowvai.in", "https://partners.glowvai.in"]);
    const h = corsHeaders(checkOrigin("https://vendor.glowvai.in", allowed));
    assert.equal(h["Access-Control-Allow-Origin"], "https://vendor.glowvai.in");
    assert.equal(h["Access-Control-Allow-Credentials"], undefined);
    assert.equal(checkOrigin("https://evil.example", allowed).kind, "denied");
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
