import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { attributedCode, nextAttribution, readAttribution, signAttribution, attributionExpiresAt, visitorClickKey, utcDay, ATTRIBUTION_WINDOW_MS } from "../../lib/shop/affiliate/attribution";
import { affiliateCodeForOrder, recordAffiliateClick, applicationPath, linkPath } from "../../lib/shop/affiliate/store";
import { MemoryRepo } from "../growth/memoryRepo";

const DAY = 86_400_000;
const T0 = Date.parse("2026-11-01T06:00:00Z");
const SECRET = "test-secret-with-enough-length-0123456789";
const CODE_A = "ABCD2345";
const CODE_B = "WXYZ6789";
const VISITOR = "visitor-abcdefghijklmnop";

describe("attribution window and last click", () => {
  test("a click opens a 30-day window from that click", () => {
    const c = nextAttribution(null, CODE_A, T0);
    assert.equal(attributedCode(c, T0 + 29 * DAY), CODE_A);
    assert.equal(attributedCode(c, T0 + 30 * DAY - 1), CODE_A);
    assert.equal(attributedCode(c, T0 + 30 * DAY), null, "the window closes exactly 30 days after the first click");
    assert.equal(attributionExpiresAt(c), T0 + ATTRIBUTION_WINDOW_MS);
  });

  test("the last click inside the window wins, and the window keeps its first-click start", () => {
    const first = nextAttribution(null, CODE_A, T0);
    const second = nextAttribution(first, CODE_B, T0 + 20 * DAY);
    assert.equal(second.code, CODE_B);
    assert.equal(second.anchor, T0, "the window still runs from the first click");
    assert.equal(attributedCode(second, T0 + 25 * DAY), CODE_B);
    assert.equal(attributedCode(second, T0 + 30 * DAY), null);
  });

  test("a click after the window has closed starts a new window", () => {
    const first = nextAttribution(null, CODE_A, T0);
    const later = nextAttribution(first, CODE_B, T0 + 31 * DAY);
    assert.equal(later.anchor, T0 + 31 * DAY);
    assert.equal(attributedCode(later, T0 + 40 * DAY), CODE_B);
  });

  test("no cookie, or a clock that moved backwards, attributes nothing", () => {
    assert.equal(attributedCode(null, T0), null);
    assert.equal(attributedCode({ code: CODE_A, anchor: T0 }, T0 - 1), null);
  });
});

describe("signed attribution cookie", () => {
  test("round trip with the right secret", () => {
    const c = { code: CODE_A, anchor: T0 };
    assert.deepEqual(readAttribution(signAttribution(c, SECRET), SECRET), c);
  });

  test("a changed window start or code is refused (the cookie cannot be edited by hand)", () => {
    const value = signAttribution({ code: CODE_A, anchor: T0 }, SECRET);
    const [payload, mac] = value.split(".");
    const forged = Buffer.from(JSON.stringify({ c: CODE_A, a: T0 + 90 * DAY })).toString("base64url");
    assert.equal(readAttribution(`${forged}.${mac}`, SECRET), null);
    const otherCode = Buffer.from(JSON.stringify({ c: CODE_B, a: T0 })).toString("base64url");
    assert.equal(readAttribution(`${otherCode}.${mac}`, SECRET), null);
    assert.ok(payload);
  });

  test("a different secret, a missing secret or junk is refused", () => {
    const value = signAttribution({ code: CODE_A, anchor: T0 }, SECRET);
    assert.equal(readAttribution(value, "another-secret-value-0123456789abcdef"), null);
    assert.equal(readAttribution(value, ""), null);
    assert.equal(readAttribution("junk", SECRET), null);
    assert.equal(readAttribution(undefined, SECRET), null);
    assert.equal(signAttribution({ code: CODE_A, anchor: T0 }, ""), "", "without a secret nothing is set");
  });
});

describe("click tracking", () => {
  test("the dedupe key hides the visitor id, and differs per link and per day", () => {
    const k = visitorClickKey(VISITOR, CODE_A, "2026-11-01");
    assert.match(k, /^[0-9a-f]{64}$/);
    assert.ok(!k.includes(VISITOR));
    assert.notEqual(k, visitorClickKey(VISITOR, CODE_B, "2026-11-01"));
    assert.notEqual(k, visitorClickKey(VISITOR, CODE_A, "2026-11-02"));
    assert.equal(utcDay(T0), "2026-11-01");
  });

  test("one visitor counts once per link per day; a second day counts again", async () => {
    const repo = new MemoryRepo();
    repo.seed(linkPath(CODE_A), { code: CODE_A, uid: "owner-1", active: true, applicationId: "app1" });
    const first = await recordAffiliateClick(repo, { code: CODE_A, visitorId: VISITOR, now: T0 });
    const again = await recordAffiliateClick(repo, { code: CODE_A, visitorId: VISITOR, now: T0 + 3_600_000 });
    const nextDay = await recordAffiliateClick(repo, { code: CODE_A, visitorId: VISITOR, now: T0 + DAY });
    assert.deepEqual(first, { active: true, counted: true });
    assert.deepEqual(again, { active: true, counted: false });
    assert.deepEqual(nextDay, { active: true, counted: true });
    assert.equal(repo.data(`affiliateDaily/${CODE_A}_2026-11-01`)?.clicks, 1);
    assert.equal(repo.data(`affiliateDaily/${CODE_A}_2026-11-02`)?.clicks, 1);
  });

  test("a different visitor counts separately on the same day", async () => {
    const repo = new MemoryRepo();
    repo.seed(linkPath(CODE_A), { code: CODE_A, uid: "owner-1", active: true, applicationId: "app1" });
    await recordAffiliateClick(repo, { code: CODE_A, visitorId: VISITOR, now: T0 });
    await recordAffiliateClick(repo, { code: CODE_A, visitorId: "another-visitor-000000", now: T0 });
    assert.equal(repo.data(`affiliateDaily/${CODE_A}_2026-11-01`)?.clicks, 2);
  });

  test("an unknown or switched-off link counts nothing and is reported inactive", async () => {
    const repo = new MemoryRepo();
    repo.seed(linkPath(CODE_B), { code: CODE_B, uid: "owner-2", active: false, applicationId: "app2" });
    assert.deepEqual(await recordAffiliateClick(repo, { code: CODE_A, visitorId: VISITOR, now: T0 }), { active: false, counted: false });
    assert.deepEqual(await recordAffiliateClick(repo, { code: CODE_B, visitorId: VISITOR, now: T0 }), { active: false, counted: false });
    assert.equal(repo.docs.size, 1, "nothing was written");
  });
});

describe("order attribution", () => {
  async function setup() {
    const repo = new MemoryRepo();
    repo.seed(linkPath(CODE_A), { code: CODE_A, uid: "affiliate-1", active: true, applicationId: "app1" });
    repo.seed(linkPath(CODE_B), { code: CODE_B, uid: "affiliate-2", active: true, applicationId: "app2" });
    return repo;
  }

  test("an order by another customer inside the window is attributed to the last click's affiliate", async () => {
    const repo = await setup();
    const cookie = signAttribution(nextAttribution(nextAttribution(null, CODE_A, T0), CODE_B, T0 + DAY), SECRET);
    assert.equal(await affiliateCodeForOrder(repo, { uid: "buyer", cookie, secret: SECRET, now: T0 + 2 * DAY }), CODE_B);
  });

  test("no self-referral: the affiliate's own order is not attributed", async () => {
    const repo = await setup();
    const cookie = signAttribution(nextAttribution(null, CODE_A, T0), SECRET);
    assert.equal(await affiliateCodeForOrder(repo, { uid: "affiliate-1", cookie, secret: SECRET, now: T0 + DAY }), null);
    assert.equal(await affiliateCodeForOrder(repo, { uid: "buyer", cookie, secret: SECRET, now: T0 + DAY }), CODE_A);
  });

  test("an order after the window, a forged cookie, or a switched-off link attributes nothing", async () => {
    const repo = await setup();
    const cookie = signAttribution(nextAttribution(null, CODE_A, T0), SECRET);
    assert.equal(await affiliateCodeForOrder(repo, { uid: "buyer", cookie, secret: SECRET, now: T0 + 30 * DAY }), null);
    assert.equal(await affiliateCodeForOrder(repo, { uid: "buyer", cookie: "forged.value", secret: SECRET, now: T0 }), null);
    assert.equal(await affiliateCodeForOrder(repo, { uid: "buyer", cookie, secret: undefined, now: T0 }), null);
    repo.seed(linkPath(CODE_A), { code: CODE_A, uid: "affiliate-1", active: false, applicationId: "app1" });
    assert.equal(await affiliateCodeForOrder(repo, { uid: "buyer", cookie, secret: SECRET, now: T0 }), null);
  });

  test("the application path helper is stable", () => {
    assert.equal(applicationPath("abc"), "affiliateApplications/abc");
  });
});
