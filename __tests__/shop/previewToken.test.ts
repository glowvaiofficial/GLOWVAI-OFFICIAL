import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyHomePreviewToken } from "@/lib/shop/previewToken";

// A test-only secret. Never a real one.
const SECRET = "test-only-preview-secret-0123456789abcdef";
const NOW = 1_800_000_000_000;

function mint(payload: object, secret = SECRET): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

test("a correctly signed, unexpired home-preview token is accepted", () => {
  assert.equal(verifyHomePreviewToken(mint({ exp: NOW + 60_000, scope: "home-preview" }), NOW, SECRET), true);
});

test("a token signed with another secret is refused", () => {
  assert.equal(verifyHomePreviewToken(mint({ exp: NOW + 60_000, scope: "home-preview" }, "another-secret-0123456789abcdefghijk"), NOW, SECRET), false);
});

test("a tampered body is refused", () => {
  const good = mint({ exp: NOW + 60_000, scope: "home-preview" });
  const [, sig] = good.split(".");
  const forged = Buffer.from(JSON.stringify({ exp: NOW + 9_000_000, scope: "home-preview" })).toString("base64url");
  assert.equal(verifyHomePreviewToken(`${forged}.${sig}`, NOW, SECRET), false);
});

test("an expired token is refused", () => {
  assert.equal(verifyHomePreviewToken(mint({ exp: NOW - 1, scope: "home-preview" }), NOW, SECRET), false);
});

test("a token for another purpose is refused", () => {
  assert.equal(verifyHomePreviewToken(mint({ exp: NOW + 60_000, scope: "rider" }), NOW, SECRET), false);
});

test("malformed input is refused without throwing", () => {
  assert.equal(verifyHomePreviewToken(null, NOW, SECRET), false);
  assert.equal(verifyHomePreviewToken("", NOW, SECRET), false);
  assert.equal(verifyHomePreviewToken("no-dot-here", NOW, SECRET), false);
  assert.equal(verifyHomePreviewToken("a.b.c", NOW, SECRET), false);
  assert.equal(verifyHomePreviewToken("!!.!!", NOW, SECRET), false);
});

test("with no secret set, nothing is accepted", () => {
  assert.equal(verifyHomePreviewToken(mint({ exp: NOW + 60_000, scope: "home-preview" }), NOW, undefined), false);
  assert.equal(verifyHomePreviewToken(mint({ exp: NOW + 60_000, scope: "home-preview" }), NOW, "short"), false);
});
