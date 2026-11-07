import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MemoryRepo } from "../growth/memoryRepo";
import { parseApplication } from "../../lib/shop/affiliate/application";
import { AFFILIATE_CONFIG } from "../../lib/shop/affiliate/config";
import { applyForAffiliate, affiliateDashboard, loadAffiliate, recordAffiliateClick, userPath, linkPath, applicationPath } from "../../lib/shop/affiliate/store";
import { reviewAffiliate, setAffiliateLinkActive, listAffiliateApplications, maskUid } from "../../lib/shop/affiliate/admin";
import { COMMISSION_LINE, PAYOUT_LINE } from "../../lib/shop/affiliate/projection";
import { sellerEntryFor } from "../../lib/shop/affiliate/seller";

const T0 = Date.parse("2026-11-01T06:00:00Z");
const UID = "customer-uid-000001";
const OTHER = "customer-uid-000002";

function parsed(overrides: Record<string, unknown> = {}) {
  const r = parseApplication({
    displayName: "Priya S.",
    primaryChannel: "INSTAGRAM",
    channelUrl: "https://www.instagram.com/priya.glow?utm=secret",
    audienceRange: "1K_TO_10K",
    categories: ["SKINCARE"],
    complianceVersion: AFFILIATE_CONFIG.complianceVersion,
    complianceAccepted: true,
    ...overrides,
  });
  if (!r.ok) throw new Error(r.field);
  return r.value;
}

async function applied(repo: MemoryRepo, uid = UID, id = "app-id-0000000001") {
  const r = await applyForAffiliate(repo, { uid, application: parsed(), now: T0, applicationId: id });
  assert.equal(r.ok, true);
  return id;
}

describe("one active application per customer", () => {
  test("a second application while one is open is refused", async () => {
    const repo = new MemoryRepo();
    await applied(repo);
    const again = await applyForAffiliate(repo, { uid: UID, application: parsed(), now: T0 + 1 });
    assert.equal(again.ok, false);
    if (!again.ok) assert.equal(again.code, "ALREADY_ACTIVE");
  });

  test("two simultaneous applications: exactly one succeeds", async () => {
    const repo = new MemoryRepo();
    const results = await Promise.all([
      applyForAffiliate(repo, { uid: UID, application: parsed(), now: T0, applicationId: "race-a-0000000001" }),
      applyForAffiliate(repo, { uid: UID, application: parsed(), now: T0, applicationId: "race-b-0000000001" }),
    ]);
    assert.equal(results.filter((r) => r.ok).length, 1);
  });

  test("after a rejection the customer may apply again", async () => {
    const repo = new MemoryRepo();
    const id = await applied(repo);
    const rejected = await reviewAffiliate(repo, { applicationId: id, status: "REJECTED", reason: "Audience not active", actor: "Asha K", now: T0 + 1 });
    assert.equal(rejected.ok, true);
    const again = await applyForAffiliate(repo, { uid: UID, application: parsed(), now: T0 + 2, applicationId: "app-id-0000000002" });
    assert.equal(again.ok, true);
  });
});

describe("staff review", () => {
  test("the full path: review, approve (one link), audited", async () => {
    const repo = new MemoryRepo();
    const id = await applied(repo);
    assert.equal((await reviewAffiliate(repo, { applicationId: id, status: "UNDER_REVIEW", actor: "Asha K", now: T0 + 1 })).ok, true);
    const approved = await reviewAffiliate(repo, { applicationId: id, status: "APPROVED", actor: "Asha K", now: T0 + 2 });
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    assert.match(approved.linkCode ?? "", /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    assert.equal(repo.data(linkPath(approved.linkCode!))?.active, true);
    assert.equal(repo.data(linkPath(approved.linkCode!))?.uid, UID);
    const audits = [...repo.docs.keys()].filter((k) => k.startsWith("affiliateAudit/"));
    assert.equal(audits.length, 2, "each decision is audited");
    const audit = repo.data(audits[0]!)!;
    assert.equal(audit.actor, "Asha K");
    assert.equal(audit.applicationId, id);
    assert.ok(!JSON.stringify(audit).includes(UID), "the audit holds no customer id");
  });

  test("invalid moves, missing reasons and bad actors are refused", async () => {
    const repo = new MemoryRepo();
    const id = await applied(repo);
    const skip = await reviewAffiliate(repo, { applicationId: id, status: "SUSPENDED", reason: "not yet approved", actor: "Asha K", now: T0 });
    assert.equal(!skip.ok && skip.code, "INVALID_TRANSITION");
    const noReason = await reviewAffiliate(repo, { applicationId: id, status: "REJECTED", actor: "Asha K", now: T0 });
    assert.equal(!noReason.ok && noReason.code, "REASON_REQUIRED");
    const noActor = await reviewAffiliate(repo, { applicationId: id, status: "UNDER_REVIEW", actor: "", now: T0 });
    assert.equal(!noActor.ok && noActor.code, "BAD_ACTOR");
    const unknown = await reviewAffiliate(repo, { applicationId: "missing-app-id-1", status: "APPROVED", actor: "Asha K", now: T0 });
    assert.equal(!unknown.ok && unknown.code, "NOT_FOUND");
    const badStatus = await reviewAffiliate(repo, { applicationId: id, status: "PAID", actor: "Asha K", now: T0 });
    assert.equal(!badStatus.ok && badStatus.code, "INVALID_STATUS");
  });

  test("suspension switches the link off; reinstating reuses the same code", async () => {
    const repo = new MemoryRepo();
    const id = await applied(repo);
    const first = await reviewAffiliate(repo, { applicationId: id, status: "APPROVED", actor: "Asha K", now: T0 });
    const code = first.ok ? first.linkCode! : "";
    const off = await reviewAffiliate(repo, { applicationId: id, status: "SUSPENDED", reason: "Misleading claims", actor: "Asha K", now: T0 + 1 });
    assert.equal(off.ok, true);
    assert.equal(repo.data(linkPath(code))?.active, false);
    const on = await reviewAffiliate(repo, { applicationId: id, status: "APPROVED", actor: "Asha K", now: T0 + 2 });
    assert.equal(on.ok && on.linkCode, code);
    assert.equal(repo.data(linkPath(code))?.active, true);
  });

  test("a rejected affiliate's link stops counting clicks", async () => {
    const repo = new MemoryRepo();
    const id = await applied(repo);
    const approved = await reviewAffiliate(repo, { applicationId: id, status: "APPROVED", actor: "Asha K", now: T0 });
    const code = approved.ok ? approved.linkCode! : "";
    await reviewAffiliate(repo, { applicationId: id, status: "SUSPENDED", reason: "Paused for review", actor: "Asha K", now: T0 + 1 });
    await reviewAffiliate(repo, { applicationId: id, status: "REJECTED", reason: "Ended by GlowVai", actor: "Asha K", now: T0 + 2 });
    assert.deepEqual(await recordAffiliateClick(repo, { code, visitorId: "visitor-abcdefghijklmnop", now: T0 + 3 }), { active: false, counted: false });
    assert.equal(repo.data(userPath(UID))?.activeApplicationId, null);
  });

  test("the link can be switched on only for an approved affiliate, and off only with a reason", async () => {
    const repo = new MemoryRepo();
    const id = await applied(repo);
    const approved = await reviewAffiliate(repo, { applicationId: id, status: "APPROVED", actor: "Asha K", now: T0 });
    const code = approved.ok ? approved.linkCode! : "";
    const noReason = await setAffiliateLinkActive(repo, { linkCode: code, active: false, actor: "Asha K", now: T0 });
    assert.equal(!noReason.ok && noReason.code, "REASON_REQUIRED");
    const off = await setAffiliateLinkActive(repo, { linkCode: code, active: false, reason: "Fraud check", actor: "Asha K", now: T0 });
    assert.equal(off.ok, true);
    const pending = await applied(repo, OTHER, "app-id-0000000003");
    const pendingLink = "PENDINGX";
    repo.seed(linkPath(pendingLink), { code: pendingLink, uid: OTHER, active: false, applicationId: pending });
    const on = await setAffiliateLinkActive(repo, { linkCode: pendingLink, active: true, actor: "Asha K", now: T0 });
    assert.equal(!on.ok && on.code, "NOT_APPROVED");
    assert.equal(repo.data(linkPath(code))?.active, false);
  });

  test("the review queue shows masked customers and only the host of a channel link", async () => {
    const repo = new MemoryRepo();
    await applied(repo);
    const list = await listAffiliateApplications(repo, { status: "APPLIED" });
    assert.equal(list.ok, true);
    if (!list.ok) return;
    assert.equal(list.rows.length, 1);
    const row = list.rows[0]!;
    assert.equal(row.channelHost, "www.instagram.com");
    assert.equal(row.uidMasked, maskUid(UID));
    assert.ok(!JSON.stringify(row).includes(UID));
    assert.ok(!JSON.stringify(row).includes("utm=secret"));
    assert.equal((await listAffiliateApplications(repo, { status: "PAID" })).ok, false);
    assert.equal((await listAffiliateApplications(repo, { limit: 0 })).ok, false);
  });
});

describe("dashboard projection and attributed orders", () => {
  test("pending application: status and profile, no link, no internal fields", async () => {
    const repo = new MemoryRepo();
    await applied(repo);
    const view = await affiliateDashboard(repo, { uid: UID, now: T0 });
    assert.equal(view.state, "APPLIED");
    assert.equal(view.link, null);
    assert.equal(view.profile?.displayName, "Priya S.");
    const json = JSON.stringify(view);
    for (const forbidden of [UID, "app-id-0000000001", "decidedBy", "decisionReason", "activeApplicationId", "uid", "complianceVersion"]) {
      assert.ok(!json.includes(forbidden), `dashboard must not contain ${forbidden}`);
    }
  });

  test("approved: the link, clicks and attributed orders (cancelled ones excluded, no customer details)", async () => {
    const repo = new MemoryRepo();
    const id = await applied(repo);
    const approved = await reviewAffiliate(repo, { applicationId: id, status: "APPROVED", actor: "Asha K", now: T0 });
    const code = approved.ok ? approved.linkCode! : "";
    await recordAffiliateClick(repo, { code, visitorId: "visitor-aaaaaaaaaaaaaaaa", now: T0 + 1 });
    await recordAffiliateClick(repo, { code, visitorId: "visitor-bbbbbbbbbbbbbbbb", now: T0 + 1 });
    repo.seed("orders/o1", { affiliateCode: code, status: "PLACED", pricing: { grandTotal: 499.4 }, userId: "buyer-1", customerName: "Ravi", customerPhone: "9999999999" });
    repo.seed("orders/o2", { affiliateCode: code, status: "CANCELLED", pricing: { grandTotal: 1000 }, userId: "buyer-2" });
    repo.seed("orders/o3", { affiliateCode: code, status: "DELIVERED", pricing: { grandTotal: 250 }, userId: "buyer-3" });
    const view = await affiliateDashboard(repo, { uid: UID, now: T0 + DAY_MS });
    assert.equal(view.state, "APPROVED");
    assert.equal(view.link?.url, `https://glowvai.in/shop?ref=${code}`);
    assert.equal(view.clicks.allTime, 2);
    assert.equal(view.clicks.last30Days, 2);
    assert.equal(view.orders.attributedCount, 2);
    assert.equal(view.orders.attributedValueRupees, 749);
    const json = JSON.stringify(view);
    for (const forbidden of ["buyer-1", "Ravi", "9999999999", UID]) assert.ok(!json.includes(forbidden));
    assert.equal(view.profile?.channelUrl, "https://www.instagram.com/priya.glow?utm=secret", "the affiliate sees their own link");
  });

  test("clicks older than 30 days count in the all-time total only", async () => {
    const repo = new MemoryRepo();
    const id = await applied(repo);
    const approved = await reviewAffiliate(repo, { applicationId: id, status: "APPROVED", actor: "Asha K", now: T0 });
    const code = approved.ok ? approved.linkCode! : "";
    await recordAffiliateClick(repo, { code, visitorId: "visitor-aaaaaaaaaaaaaaaa", now: T0 });
    const view = await affiliateDashboard(repo, { uid: UID, now: T0 + 40 * DAY_MS });
    assert.equal(view.clicks.allTime, 1);
    assert.equal(view.clicks.last30Days, 0);
  });

  test("commission and payout lines say no percentages and reflect the honest state", () => {
    assert.doesNotMatch(COMMISSION_LINE, /%|percent/i);
    assert.equal(COMMISSION_LINE, "Commission rates are set by GlowVai and shown here once confirmed");
    assert.equal(PAYOUT_LINE, "Payouts will appear here once set up");
  });

  test("a customer with no application sees NONE, and the lookup creates nothing", async () => {
    const repo = new MemoryRepo();
    const view = await affiliateDashboard(repo, { uid: OTHER, now: T0 });
    assert.equal(view.state, "NONE");
    assert.equal(view.link, null);
    assert.equal(repo.docs.size, 0);
    assert.deepEqual(await loadAffiliate(repo, OTHER), { applicationId: null, application: null, link: null });
    assert.ok(repo.data(applicationPath("nothing")) === undefined);
  });
});

describe("seller entry", () => {
  test("not open when VENDOR_APPLY_URL is unset: no link, no invented URL", () => {
    const entry = sellerEntryFor({});
    assert.deepEqual(entry, { open: false, message: "Seller applications open soon." });
    assert.equal(sellerEntryFor({ VENDOR_APPLY_URL: "" }).open, false);
    assert.equal(sellerEntryFor({ VENDOR_APPLY_URL: "http://insecure.example.com" }).open, false);
    assert.equal(sellerEntryFor({ VENDOR_APPLY_URL: "javascript:alert(1)" }).open, false);
  });

  test("open with the configured https address", () => {
    assert.deepEqual(sellerEntryFor({ VENDOR_APPLY_URL: "https://vendors.example.com/apply" }), { open: true, href: "https://vendors.example.com/apply" });
  });
});

const DAY_MS = 86_400_000;
