import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { maskIfsc, operatingVendor, toVendorMe, vendorStateOf } from "../../lib/vendor/state";

const app = (extra: Record<string, unknown> = {}) => ({
  storeName: "Glow Pharmacy",
  ownerName: "Asha Rao",
  contactNumber: "+919876543210",
  email: "asha@example.com",
  streetAddress: "12 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560038",
  servicePincodes: ["560038"],
  operatingHours: { openTime: "09:00", closeTime: "21:00", isOpenToday: true },
  categories: ["skincare"],
  status: "PENDING_APPROVAL",
  submittedAt: 1000,
  updatedAt: 2000,
  isOnline: false,
  lastSeenAt: null,
  ...extra,
});

describe("vendorStateOf", () => {
  test("no application", () => {
    assert.deepEqual(vendorStateOf(null, { applicationStatus: "APPROVED", operationalStatus: "ACTIVE" }), { state: "NO_APPLICATION", canOperate: false, approved: false });
  });

  test("application without overlay is SUBMITTED", () => {
    assert.equal(vendorStateOf(app(), null).state, "SUBMITTED");
    assert.equal(vendorStateOf(app(), { applicationStatus: "SUBMITTED" }).state, "SUBMITTED");
  });

  test("overlay states map one to one", () => {
    assert.equal(vendorStateOf(app(), { applicationStatus: "UNDER_REVIEW" }).state, "UNDER_REVIEW");
    assert.deepEqual(vendorStateOf(app(), { applicationStatus: "APPROVED", operationalStatus: "ACTIVE" }), { state: "APPROVED_ACTIVE", canOperate: true, approved: true });
    assert.deepEqual(vendorStateOf(app(), { applicationStatus: "APPROVED", operationalStatus: "PAUSED" }), { state: "APPROVED_PAUSED", canOperate: false, approved: true });
    // Approved without an operational status may not operate.
    assert.equal(vendorStateOf(app(), { applicationStatus: "APPROVED" }).canOperate, false);
    const suspended = vendorStateOf(app(), { applicationStatus: "APPROVED", operationalStatus: "SUSPENDED" });
    assert.equal(suspended.state, "SUSPENDED");
    assert.equal(suspended.canOperate, false);
  });

  test("rejected: reason is the latest history reason", () => {
    const s = vendorStateOf(app(), {
      applicationStatus: "REJECTED",
      history: [
        { at: "2026-11-01T10:00:00.000Z", actor: "Ops", event: "Requested documents", reason: "Need GST" },
        { at: "2026-11-02T10:00:00.000Z", actor: "Ops", event: "Rejected", reason: "Store outside service area" },
        { at: "2026-11-03T10:00:00.000Z", actor: "Ops", event: "Viewed" },
      ],
    });
    assert.equal(s.state, "REJECTED");
    assert.equal(s.reason, "Store outside service area");
    assert.equal(s.requestedDocuments, undefined);
  });

  test("documents requested lists MISSING documents", () => {
    const s = vendorStateOf(app(), {
      applicationStatus: "DOCUMENTS_REQUESTED",
      documents: [
        { name: "GST certificate", status: "MISSING" },
        { name: "Shop licence", status: "PRESENT" },
        { name: "Bank proof", status: "MISSING" },
      ],
      history: [{ at: 1700, actor: "Ops", event: "Requested documents", reason: "Upload GST and bank proof" }],
    });
    assert.equal(s.state, "DOCUMENTS_REQUESTED");
    assert.equal(s.reason, "Upload GST and bank proof");
    assert.deepEqual(s.requestedDocuments, ["GST certificate", "Bank proof"]);
  });

  test("resubmitted after overlayUpdatedAt: SUBMITTED with no reason or documents", () => {
    const stamp = "2026-11-05T08:00:00.000Z";
    const at = Date.parse(stamp);
    for (const applicationStatus of ["REJECTED", "DOCUMENTS_REQUESTED"]) {
      const overlay = {
        applicationStatus,
        overlayUpdatedAt: stamp,
        documents: [{ name: "GST certificate", status: "MISSING" }],
        // A history entry later than overlayUpdatedAt must not matter: overlayUpdatedAt is the staff change time.
        history: [{ at: "2026-11-06T08:00:00.000Z", reason: "Blurry photo" }],
      };
      assert.deepEqual(vendorStateOf(app({ resubmittedAt: at + 1 }), overlay), { state: "SUBMITTED", canOperate: false, approved: false }, applicationStatus);
      const before = vendorStateOf(app({ resubmittedAt: at - 1 }), overlay);
      assert.equal(before.state, applicationStatus);
      assert.equal(before.reason, "Blurry photo");
      // Never resubmitted: the staff decision stands.
      assert.equal(vendorStateOf(app(), overlay).state, applicationStatus);
    }
  });

  test("older overlays without overlayUpdatedAt fall back to the latest history time", () => {
    const overlay = { applicationStatus: "REJECTED", history: [{ at: "2026-11-02T10:00:00.000Z", reason: "Blurry" }] };
    const decided = Date.parse("2026-11-02T10:00:00.000Z");
    assert.equal(vendorStateOf(app({ resubmittedAt: decided - 1 }), overlay).state, "REJECTED");
    assert.equal(vendorStateOf(app({ resubmittedAt: decided + 1 }), overlay).state, "SUBMITTED");
  });

  test("resubmission never overrides an approval or review", () => {
    assert.equal(vendorStateOf(app({ resubmittedAt: Date.now() }), { applicationStatus: "UNDER_REVIEW", overlayUpdatedAt: "2020-01-01T00:00:00.000Z" }).state, "UNDER_REVIEW");
    assert.equal(
      vendorStateOf(app({ resubmittedAt: Date.now() }), { applicationStatus: "APPROVED", operationalStatus: "ACTIVE", overlayUpdatedAt: "2020-01-01T00:00:00.000Z" }).state,
      "APPROVED_ACTIVE",
    );
  });
});

describe("toVendorMe", () => {
  test("projects the application and masks bank details", () => {
    const me = toVendorMe(
      "u1",
      app({ isOnline: true, lastSeenAt: 5000, panLast4: "234F", bank: { holderName: "A", bankName: "B", ifsc: "HDFC0001234", accLast4: "6789" } }),
      { applicationStatus: "APPROVED", operationalStatus: "ACTIVE" },
    );
    assert.equal(me.applicationId, "VAPP-u1");
    assert.equal(me.state, "APPROVED_ACTIVE");
    assert.equal(me.canOperate, true);
    assert.equal(me.isOnline, true);
    assert.equal(me.lastSeenAt, 5000);
    assert.deepEqual(me.application?.bank, { holderName: "A", bankName: "B", ifscMasked: "HDFC0••••34", accLast4: "6789" });
    assert.ok(!JSON.stringify(me).includes("HDFC0001234"));
    assert.equal(me.application?.panLast4, "234F");
  });

  test("resubmitted vendor gets no reason or requestedDocuments keys", () => {
    const me = toVendorMe("u1", app({ resubmittedAt: Date.parse("2026-11-05T09:00:00.000Z") }), {
      applicationStatus: "DOCUMENTS_REQUESTED",
      overlayUpdatedAt: "2026-11-05T08:00:00.000Z",
      documents: [{ name: "GST certificate", status: "MISSING" }],
      history: [{ at: "2026-11-05T08:00:00.000Z", reason: "Upload GST" }],
    });
    assert.equal(me.state, "SUBMITTED");
    assert.ok(!("reason" in me));
    assert.ok(!("requestedDocuments" in me));
  });

  test("no application", () => {
    assert.deepEqual(toVendorMe("u1", null, null), { applicationId: "VAPP-u1", state: "NO_APPLICATION", canOperate: false, isOnline: false, lastSeenAt: null, application: null });
  });

  test("maskIfsc is idempotent", () => {
    assert.equal(maskIfsc("HDFC0001234"), "HDFC0••••34");
    assert.equal(maskIfsc(maskIfsc("HDFC0001234")), "HDFC0••••34");
  });

  test("operatingVendor", () => {
    const v = operatingVendor("u1", app({ isOnline: true, lastSeenAt: 10, servicePincodes: ["560038", "560008"] }), { applicationStatus: "APPROVED", operationalStatus: "PAUSED" });
    assert.deepEqual(v, {
      uid: "u1",
      applicationId: "VAPP-u1",
      storeName: "Glow Pharmacy",
      canOperate: false,
      approved: true,
      isOnline: true,
      lastSeenAt: 10,
      servicePincodes: ["560038", "560008"],
    });
  });
});
