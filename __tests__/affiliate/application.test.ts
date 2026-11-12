import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseApplication, affiliateEligibility } from "../../lib/shop/affiliate/application";
import { AFFILIATE_CONFIG, AFFILIATE_COMPLIANCE_TEXT } from "../../lib/shop/affiliate/config";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-07T10:00:00Z");

const valid = () => ({
  displayName: "Priya S.",
  primaryChannel: "INSTAGRAM",
  channelUrl: "https://www.instagram.com/priya.glow",
  audienceRange: "1K_TO_10K",
  categories: ["SKINCARE", "MAKEUP"],
  complianceVersion: AFFILIATE_CONFIG.complianceVersion,
  complianceAccepted: true,
});

function fieldOf(body: unknown): string | null {
  const r = parseApplication(body);
  return r.ok ? null : r.field;
}

describe("affiliate application form", () => {
  test("a complete form is accepted and normalised", () => {
    const r = parseApplication({ ...valid(), displayName: "  Priya   S. " });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.displayName, "Priya S.");
      assert.equal(r.value.channelUrl, "https://www.instagram.com/priya.glow");
      assert.deepEqual(r.value.categories, ["SKINCARE", "MAKEUP"]);
    }
  });

  test("a first name alone is enough; a full name is not required", () => {
    assert.equal(parseApplication({ ...valid(), displayName: "Priya" }).ok, true);
  });

  test("display names with digits, symbols, links or an @ are refused", () => {
    for (const name of ["Priya2", "priya@glow", "<b>Priya</b>", "https://x.com", "A"]) {
      assert.equal(fieldOf({ ...valid(), displayName: name }), "displayName", name);
    }
    assert.equal(fieldOf({ ...valid(), displayName: "x".repeat(AFFILIATE_CONFIG.displayNameMax + 1) }), "displayName");
  });

  test("an invalid channel URL is refused, javascript: and data: included", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,hi", "https://bit.ly/abc", "notaurl"]) {
      assert.equal(fieldOf({ ...valid(), channelUrl: url }), "channelUrl", url);
    }
  });

  test("the channel URL is optional", () => {
    assert.equal(parseApplication({ ...valid(), channelUrl: "" }).ok, true);
  });

  test("channel, audience and categories must be listed values", () => {
    assert.equal(fieldOf({ ...valid(), primaryChannel: "TIKTOK" }), "primaryChannel");
    assert.equal(fieldOf({ ...valid(), audienceRange: "42" }), "audienceRange");
    assert.equal(fieldOf({ ...valid(), categories: [] }), "categories");
    assert.equal(fieldOf({ ...valid(), categories: ["GROCERIES"] }), "categories");
    assert.equal(fieldOf({ ...valid(), categories: Array(7).fill("SKINCARE") }), "categories");
  });

  test("duplicate categories collapse to one", () => {
    const r = parseApplication({ ...valid(), categories: ["SKINCARE", "SKINCARE"] });
    assert.equal(r.ok && r.value.categories.length, 1);
  });

  test("the rules must be accepted, at the current version", () => {
    assert.equal(fieldOf({ ...valid(), complianceAccepted: false }), "compliance");
    assert.equal(fieldOf({ ...valid(), complianceVersion: "2019-old" }), "compliance");
  });

  test("a non-object body is refused", () => {
    assert.equal(fieldOf(null), "form");
    assert.equal(fieldOf(["x"]), "form");
  });

  test("the compliance text names no commission percentage", () => {
    assert.doesNotMatch(AFFILIATE_COMPLIANCE_TEXT, /%|per ?cent|percent/i);
  });
});

describe("who may apply", () => {
  test("a verified email is enough, even on a new account", () => {
    assert.deepEqual(affiliateEligibility({ emailVerified: true, accountCreatedAt: NOW, now: NOW }), { eligible: true, basis: "VERIFIED_EMAIL" });
  });

  test("without a verified email the account must be 7 days old (anonymous accounts included)", () => {
    assert.equal(affiliateEligibility({ emailVerified: false, accountCreatedAt: NOW - 6 * DAY, now: NOW }).eligible, false);
    assert.deepEqual(affiliateEligibility({ emailVerified: false, accountCreatedAt: NOW - 7 * DAY, now: NOW }), { eligible: true, basis: "ACCOUNT_AGE" });
  });

  test("an unknown creation time is refused", () => {
    assert.equal(affiliateEligibility({ emailVerified: false, accountCreatedAt: null, now: NOW }).eligible, false);
  });
});
