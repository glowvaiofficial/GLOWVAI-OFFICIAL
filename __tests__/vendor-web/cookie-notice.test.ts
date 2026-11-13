import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isCookieNoticeHidden } from "../../lib/consent/notice";

describe("cookie notice on vendor pages", () => {
  test("hidden on /vendor and every page under it, so it never covers vendor controls", () => {
    for (const p of ["/vendor", "/vendor/", "/vendor/sign-in", "/vendor/onboarding", "/vendor/orders/abc123/pack"]) {
      assert.equal(isCookieNoticeHidden(p), true, p);
    }
  });

  test("shown on the shop and other pages, including look-alikes of /vendor", () => {
    for (const p of ["/", "/shop", "/shop/vendor", "/vendors", "/vendorx", "/vendor-sign-in", "/privacy", "", null, undefined]) {
      assert.equal(isCookieNoticeHidden(p as string | null | undefined), false, String(p));
    }
  });

  test("rider pages stay hidden as before", () => {
    assert.equal(isCookieNoticeHidden("/rider"), true);
    assert.equal(isCookieNoticeHidden("/rider/deliveries"), true);
  });
});
