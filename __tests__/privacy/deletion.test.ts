import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DELETION_TIMING, isOpenDeletion, nextDeletionStatus, type DeletionStatus } from "../../lib/shop/privacy/rules";

const step = (s: DeletionStatus | null, a: "request" | "cancel" | "start" | "complete") => nextDeletionStatus(s, a);

describe("account deletion request state machine", () => {
  test("a customer with no request can request deletion", () => {
    assert.deepEqual(step(null, "request"), { ok: true, status: "REQUESTED" });
  });

  test("a cancelled request can be made again", () => {
    assert.deepEqual(step("CANCELLED", "request"), { ok: true, status: "REQUESTED" });
  });

  test("an open request cannot be duplicated", () => {
    assert.deepEqual(step("REQUESTED", "request"), { ok: false, code: "ALREADY_REQUESTED" });
    assert.deepEqual(step("PROCESSING", "request"), { ok: false, code: "ALREADY_REQUESTED" });
  });

  test("the customer can cancel while the request is REQUESTED", () => {
    assert.deepEqual(step("REQUESTED", "cancel"), { ok: true, status: "CANCELLED" });
  });

  test("the customer cannot cancel once processing has started or finished", () => {
    assert.deepEqual(step("PROCESSING", "cancel"), { ok: false, code: "NOT_CANCELLABLE" });
    assert.deepEqual(step("COMPLETED", "cancel"), { ok: false, code: "NOT_CANCELLABLE" });
    assert.deepEqual(step(null, "cancel"), { ok: false, code: "NOT_CANCELLABLE" });
    assert.deepEqual(step("CANCELLED", "cancel"), { ok: false, code: "NOT_CANCELLABLE" });
  });

  test("only the admin process starts and completes, in order", () => {
    assert.deepEqual(step("REQUESTED", "start"), { ok: true, status: "PROCESSING" });
    assert.deepEqual(step("PROCESSING", "complete"), { ok: true, status: "COMPLETED" });
    assert.deepEqual(step("REQUESTED", "complete"), { ok: false, code: "INVALID_TRANSITION" });
    assert.deepEqual(step("CANCELLED", "start"), { ok: false, code: "INVALID_TRANSITION" });
    assert.deepEqual(step(null, "start"), { ok: false, code: "INVALID_TRANSITION" });
  });

  test("open means requested or processing", () => {
    assert.equal(isOpenDeletion("REQUESTED"), true);
    assert.equal(isOpenDeletion("PROCESSING"), true);
    assert.equal(isOpenDeletion("CANCELLED"), false);
    assert.equal(isOpenDeletion("COMPLETED"), false);
    assert.equal(isOpenDeletion(null), false);
  });

  test("the timing shown is the one the privacy policy states", () => {
    assert.equal(DELETION_TIMING.acknowledgeWithin, "48 hours");
    assert.equal(DELETION_TIMING.resolveWithin, "7 business days");
  });
});
