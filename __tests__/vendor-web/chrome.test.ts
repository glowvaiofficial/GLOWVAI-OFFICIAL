import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isVendorPath } from "../../lib/vendor-web/chrome";

describe("site chrome bypass for the vendor store", () => {
  test("/vendor and every page under it bypass the shop chrome", () => {
    for (const p of ["/vendor", "/vendor/", "/vendor/sign-in", "/vendor/orders", "/vendor/orders/abc123/pack", "/vendor/notifications"]) {
      assert.equal(isVendorPath(p), true, p);
    }
  });

  test("other paths, including look-alikes, keep the site chrome", () => {
    for (const p of ["/", "/shop", "/shop/vendor", "/vendors", "/vendorx", "/rider", "/vendor-sign-in", "", null, undefined]) {
      assert.equal(isVendorPath(p as string | null | undefined), false, String(p));
    }
  });
});
