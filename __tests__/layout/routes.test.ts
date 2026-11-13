// Route-level check list for the layout audit (scripts: see the ux-layout audit). Each entry is checked at 390x844 and
// 1440x900 for: no horizontal overflow (scrollWidth == clientWidth), no text on the screen edge, phone text fields at
// 16px, phone buttons at 44px, and content kept clear of fixed bars.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

// Site pages (Next.js routes under app/). Each must exist as a page file.
export const SITE_ROUTES: { route: string; file: string }[] = [
  { route: "/", file: "app/page.tsx" },
  { route: "/shop", file: "app/shop/[[...slug]]/page.tsx" },
  { route: "/shop?product=<id>", file: "app/shop/[[...slug]]/page.tsx" },
  { route: "/product/<slug>", file: "app/product/[slug]/page.tsx" },
  { route: "/faq", file: "app/faq/page.tsx" },
  { route: "/terms", file: "app/terms/page.tsx" },
  { route: "/privacy", file: "app/privacy/page.tsx" },
  { route: "/help", file: "app/help/page.tsx" },
  { route: "/rider", file: "app/rider/page.tsx" },
  { route: "/sell", file: "app/sell/page.tsx" },
  { route: "/affiliate", file: "app/affiliate/page.tsx" },
  { route: "/vendor", file: "app/vendor/page.tsx" },
  { route: "/vendor/sign-in", file: "app/vendor/(account)/sign-in/page.tsx" },
];

// Shop app screens (opened inside /shop by the app's own navigation).
export const SHOP_SCREENS: string[] = [
  "cart-tab", "checkout", "checkout-review", "checkout-payment-method", "address-list",
  "orders-list", "orders-detail", "orders-tracking", "shop-wishlist",
  "profile-tab", "profile-settings", "settings-language", "settings-notifications", "settings-activity",
  "settings-wallet", "settings-gift-cards", "settings-privacy", "settings-sell", "settings-affiliate",
  "privacy-center", "privacy-devices", "payment-methods", "gift-cards", "wallet-home",
  "help-index", "help-faq", "help-terms", "help-privacy", "notifications-list", "shop-browse", "shop-search-filters",
];

describe("layout route check list", () => {
  for (const { route, file } of SITE_ROUTES) {
    test(`${route} has a page file`, () => {
      assert.ok(existsSync(join(root, file)), `${file} missing`);
    });
  }

  test("shop screens are all named in the ported route registry", () => {
    const names = readFileSync(join(root, "glowvai-app/core/routes/names.ts"), "utf8");
    const navNames = readFileSync(join(root, "glowvai-app/context/contextDefinition.ts"), "utf8");
    for (const screen of SHOP_SCREENS) {
      assert.ok(names.includes(`'${screen}'`) || navNames.includes(`'${screen}'`), `${screen} not a known screen`);
    }
  });

  test("the vendor shell does not pick up shop or site layout classes", () => {
    const vendorLayout = readFileSync(join(root, "app/vendor/layout.tsx"), "utf8");
    assert.doesNotMatch(vendorLayout, /glowvai-root|gv-page|gv-clear-sticky-cta/);
    const wrapper = readFileSync(join(root, "components/layout/HeaderAndFooterWrapper.tsx"), "utf8");
    const vendorBranch = wrapper.slice(wrapper.indexOf("isVendorPath(pathname)"), wrapper.indexOf("isVendorPath(pathname)") + 200);
    assert.doesNotMatch(vendorBranch, /gv-clear-sticky-cta/);
  });

  test("site pages keep clear of the phone sticky CTA", () => {
    const wrapper = readFileSync(join(root, "components/layout/HeaderAndFooterWrapper.tsx"), "utf8");
    assert.match(wrapper, /<main id="main" className="flex-1 gv-clear-sticky-cta">/);
    const sticky = readFileSync(join(root, "components/layout/StickyCtaBar.tsx"), "utf8");
    assert.match(sticky, /md:hidden fixed inset-x-0 bottom-0/);
  });
});
