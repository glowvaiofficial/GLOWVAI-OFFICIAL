import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  accountStateOf,
  afterSignIn,
  gateNavigation as gateNavigationWith,
  screenOpensWithoutAccount,
  requiresSignIn as requiresSignInWith,
  startScreenFor as startScreenForWith,
  type AccountState,
  type ScreenTarget,
} from "../../glowvai-app/features/auth/accountGate";

// The tests below describe the gate as it behaves with NEXT_PUBLIC_REQUIRE_PHONE_SIGN_IN=true. The switch is passed
// explicitly, so they hold whatever the environment says. The gate-off table is at the end of this file.
const gateNavigation = (account: AccountState, target: ScreenTarget) => gateNavigationWith(account, target, true);
const requiresSignIn = (action: string) => requiresSignInWith(action, true);
const startScreenFor = (account: AccountState) => startScreenForWith(account, true);
import { guestAreaAddress, isServiceableAreaPincode, parseGuestArea, readGuestArea, saveGuestArea } from "../../glowvai-app/features/commerce/lib/guestArea";
import { holdAction, takeHeldAction } from "../../glowvai-app/features/auth/resumeAction";

const root = join(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(join(root, file), "utf8").replace(/\r\n/g, "\n");

const phoneUser = { isAnonymous: false, providerData: [{ providerId: "phone" }] };
const anonymousUser = { isAnonymous: true, providerData: [] };
const googleUser = { isAnonymous: false, providerData: [{ providerId: "google.com" }] };
const NONE: AccountState = "none";
const PHONE: AccountState = "phone";

describe("who has an account", () => {
  test("no user, or an anonymous browsing session, is not an account", () => {
    assert.equal(accountStateOf(null), NONE);
    assert.equal(accountStateOf(undefined), NONE);
    assert.equal(accountStateOf(anonymousUser), NONE);
  });

  test("a phone-provider user is the phone account", () => {
    assert.equal(accountStateOf(phoneUser), PHONE);
  });

  test("other providers are not the phone account, and null provider rows are tolerated", () => {
    assert.equal(accountStateOf(googleUser), NONE);
    assert.equal(accountStateOf({ isAnonymous: false, providerData: [null, { providerId: "phone" }] }), PHONE);
  });
});

describe("the first screen", () => {
  test("no account starts on the onboarding screens", () => {
    assert.equal(startScreenFor(NONE), "auth-onboarding");
  });

  test("a signed-in account starts on the shop", () => {
    assert.equal(startScreenFor(PHONE), "shop-home");
  });
});

describe("the decision table: which screens open without an account", () => {
  test("the product list and product pages open as a preview", () => {
    for (const screen of ["shop-home", "home", "shop-browse", "shop-product", "product-detail", "search", "categories", "shop-category"]) {
      assert.equal(screenOpensWithoutAccount(screen), true, screen);
      assert.deepEqual(gateNavigation(NONE, { screen, params: { productId: "p1" } }), { screen, params: { productId: "p1" } }, screen);
    }
  });

  test("the onboarding and sign-in screens open without an account", () => {
    for (const screen of ["auth-onboarding", "auth-welcome", "auth-login", "auth-otp", "auth-verify-otp"]) {
      assert.equal(gateNavigation(NONE, { screen, params: null }).screen, screen, screen);
    }
  });

  test("the bag, checkout, orders, profile, wishlist and scan need an account", () => {
    for (const screen of ["checkout", "checkout-payment-method", "customer-details", "orders-list", "order-history", "profile-tab", "shop-wishlist", "face-prep", "scan-camera", "scan-gallery", "wallet-home", "support", "notifications-list"]) {
      assert.equal(screenOpensWithoutAccount(screen), false, screen);
    }
  });

  test("an unknown screen name is refused without an account (default deny)", () => {
    assert.equal(gateNavigation(NONE, { screen: "something-new", params: null }).screen, "auth-login");
  });
});

describe("gating a navigation", () => {
  test("no account, a screen that needs one: the sign-in screen, remembering where to return", () => {
    const decision = gateNavigation(NONE, { screen: "checkout-review", params: null });
    assert.deepEqual(decision, { screen: "auth-login", params: { returnTo: "checkout-review", returnParams: null } });
  });

  test("the return keeps the screen's params", () => {
    const decision = gateNavigation(NONE, { screen: "customer-details", params: { returnTo: "checkout-payment-method" } });
    assert.equal(decision.screen, "auth-login");
    assert.deepEqual(decision.params, { returnTo: "customer-details", returnParams: { returnTo: "checkout-payment-method" } });
  });

  test("an account opens any shop screen as asked", () => {
    assert.deepEqual(gateNavigation(PHONE, { screen: "checkout", params: { a: 1 } }), { screen: "checkout", params: { a: 1 } });
    assert.deepEqual(gateNavigation(PHONE, { screen: "face-prep", params: null }), { screen: "face-prep", params: null });
  });

  test("an account opening a sign-in screen goes to where it was going, or the shop", () => {
    assert.deepEqual(gateNavigation(PHONE, { screen: "auth-login", params: null }), { screen: "shop-home", params: null });
    assert.deepEqual(
      gateNavigation(PHONE, { screen: "auth-otp", params: { returnTo: "checkout", returnParams: { step: 2 } } }),
      { screen: "checkout", params: { step: 2 } },
    );
    // The legacy name 'login' is the same sign-in screen.
    assert.deepEqual(
      gateNavigation(PHONE, { screen: "login", params: { returnTo: "checkout-payment-method" } }),
      { screen: "checkout-payment-method", params: null },
    );
  });
});

describe("returning after the code is checked", () => {
  test("goes back to the screen that asked for sign-in, with its params", () => {
    assert.deepEqual(afterSignIn({ returnTo: "checkout", returnParams: { a: 1 } }), { screen: "checkout", params: { a: 1 } });
  });

  test("with no return target, goes to the shop", () => {
    assert.deepEqual(afterSignIn(undefined), { screen: "shop-home", params: null });
    assert.deepEqual(afterSignIn({}), { screen: "shop-home", params: null });
  });

  test("a return target that is not a plain screen name, or is a sign-in screen, goes to the shop", () => {
    assert.deepEqual(afterSignIn({ returnTo: "https://evil.example" }), { screen: "shop-home", params: null });
    assert.deepEqual(afterSignIn({ returnTo: "Cart Tab" }), { screen: "shop-home", params: null });
    assert.deepEqual(afterSignIn({ returnTo: "auth-otp" }), { screen: "shop-home", params: null });
    assert.deepEqual(afterSignIn("checkout"), { screen: "shop-home", params: null });
  });
});

describe("the whole journey", () => {
  test("a new visitor: onboarding, then sign-in, then the shop; a blocked action returns to its screen", () => {
    // 1. Fresh visit with no account.
    assert.equal(startScreenFor(NONE), "auth-onboarding");
    // 2. The intro leads to sign-in (an allowed screen).
    assert.equal(gateNavigation(NONE, { screen: "auth-login", params: null }).screen, "auth-login");
    // 3. From a product preview, the bag asks for sign-in and remembers the product page.
    const ask = gateNavigation(NONE, { screen: "checkout-review", params: null });
    assert.equal(ask.screen, "auth-login");
    // 4. The code is checked: the account is the phone account, and the bag opens.
    assert.equal(accountStateOf(phoneUser), PHONE);
    assert.deepEqual(gateNavigation(PHONE, { screen: "auth-login", params: { returnTo: "checkout-review" } }), { screen: "checkout-review", params: null });
  });

  test("a returning signed-in account goes straight to the shop", () => {
    assert.equal(startScreenFor(accountStateOf(phoneUser)), "shop-home");
  });
});

describe("actions held while the sign-in runs", () => {
  test("a held action runs once, after sign-in", () => {
    let ran = 0;
    holdAction(() => {
      ran += 1;
    });
    const action = takeHeldAction();
    assert.equal(typeof action, "function");
    action?.();
    assert.equal(ran, 1);
    assert.equal(takeHeldAction(), null);
  });

  test("nothing is held by default", () => {
    assert.equal(takeHeldAction(), null);
  });
});

describe("the sign-in screens ask for the phone number only", () => {
  const screens = [
    "glowvai-app/features/auth/PhoneSignInScreen.tsx",
    "glowvai-app/features/auth/OtpScreen.tsx",
  ];
  for (const file of screens) {
    test(`${file} has no name, email or skin question`, () => {
      const source = read(file);
      assert.doesNotMatch(source, /type="email"|autoComplete="name"|autoComplete="email"|placeholder="Your name"/);
      assert.doesNotMatch(source, /skin|Skin|concern|survey/);
    });
  }

  test("the phone screen takes a number and sends the code; the code screen checks the six digits", () => {
    const phone = read("glowvai-app/features/auth/PhoneSignInScreen.tsx");
    assert.match(phone, /sendPhoneCode\(e164\)/);
    assert.match(phone, /navigate\('auth-otp'/);
    const otp = read("glowvai-app/features/auth/OtpScreen.tsx");
    assert.match(otp, /otpCode\(code\)/);
    assert.match(otp, /You're in/);
    assert.match(otp, /ensureAccountRecord\(uid\)/);
  });

  test("the resend is held for 30 seconds", () => {
    assert.match(read("glowvai-app/features/auth/phoneAuthRules.ts"), /RESEND_SECONDS = 30/);
  });
});

describe("wiring in the app", () => {
  test("navigation, restored steps and the bag and wishlist all pass through the gate", () => {
    const ctx = read("glowvai-app/context/AppContext.tsx");
    assert.match(ctx, /gateNavigation\(accountNow\(\), \{ screen: requested/);
    assert.match(ctx, /gateNavigation\(accountNow\(\), \{ screen: first\.screen/);
    assert.match(ctx, /gateNavigation\(accountNow\(\), \{ screen: restored\.screen/);
    assert.match(ctx, /const first: NavEntry = saved/);
  });

  test("the first screen is read from the account when the provider mounts", () => {
    const ctx = read("glowvai-app/context/AppContext.tsx");
    assert.match(ctx, /startScreenFor\(accountNow\(\)\)/);
    assert.match(ctx, /screen: initialScreen\(\)/);
  });

  test("the intro leads to sign-in when signed out and to the quiz when signed in", () => {
    const onboarding = read("glowvai-app/screens/OnboardingScreen.tsx");
    assert.match(onboarding, /navigate\(accountSignedIn \? 'auth-skin-survey' : 'auth-login'\)/);
  });

  test("the app waits for the saved session before it chooses a first screen", () => {
    const app = read("glowvai-app/App.tsx");
    assert.match(app, /auth\?\.authStateReady \? auth\.authStateReady\(\)/);
    assert.match(app, /if \(!ready\) return <div className="app-viewport glowvai-boot"/);
  });

  test("the sign-in screens are mapped to the phone screens; details stay on customer-details", () => {
    const app = read("glowvai-app/App.tsx");
    assert.match(app, /case 'login':\n\s+return <PhoneSignInScreen \/>;/);
    assert.match(app, /case 'otp':\n\s+return <OtpScreen \/>;/);
    assert.match(app, /case 'customer-details':\n\s+return <LoginScreen \/>;/);
    const routes = read("glowvai-app/features/auth/routes.tsx");
    assert.match(routes, /'auth-login': PhoneSignInScreen/);
    assert.match(routes, /'auth-otp': OtpScreen/);
  });

  test("screens that want the details form open customer-details, not the sign-in screen", () => {
    for (const file of [
      "glowvai-app/features/commerce/PaymentMethodScreen.tsx",
      "glowvai-app/features/commerce/PaymentProcessingScreen.tsx",
      "glowvai-app/features/profile/HelpAndSupportScreen.tsx",
      "glowvai-app/features/profile/ProfileOverviewScreen.tsx",
      "glowvai-app/features/profile/SettingsAndSecurityScreen.tsx",
    ]) {
      assert.doesNotMatch(read(file), /navigate\('login'|leave\('login'|'login' :/, file);
    }
  });
});

describe("what a guest may do (requiresSignIn)", () => {
  test("browsing, the cart, the delivery area, the scan intro and the wishlist heart need no account", () => {
    for (const action of ["browse", "open-cart", "add-to-cart", "apply-coupon-preview", "set-delivery-area", "check-pincode", "open-scan-intro", "wishlist-toggle"]) {
      assert.equal(requiresSignIn(action), false, action);
    }
  });
  test("checkout, payment, a named address, the scan itself, orders and the account need sign-in", () => {
    for (const action of ["checkout", "place-order", "payment", "save-named-address", "start-scan", "upload-scan-photo", "open-orders", "open-account"]) {
      assert.equal(requiresSignIn(action), true, action);
    }
  });
  test("an unknown action asks for sign-in", () => {
    assert.equal(requiresSignIn("something-new"), true);
    assert.equal(requiresSignIn("toString"), true);
  });
  test("the guest screens open, and starting the scan or checkout goes to sign-in", () => {
    for (const screen of ["cart-tab", "cart", "location-setup", "location-map-picker", "location-serviceability", "scan-tab", "scan-intro"]) {
      assert.equal(gateNavigation(NONE, { screen, params: null }).screen, screen, screen);
    }
    assert.equal(gateNavigation(NONE, { screen: "scan-camera", params: null }).screen, "auth-login");
    assert.equal(gateNavigation(NONE, { screen: "checkout-review", params: null }).screen, "auth-login");
    assert.equal(gateNavigation(NONE, { screen: "profile-tab", params: null }).screen, "auth-login");
  });
});

describe("the delivery area kept for a guest", () => {
  test("keeps the area name and pincode, rejects bad data", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    saveGuestArea({ area: "Benz Circle, Vijayawada", pincode: "520010" }, storage);
    assert.deepEqual(readGuestArea(storage), { area: "Benz Circle", pincode: "520010" });
    assert.equal(parseGuestArea("{bad"), null);
    assert.equal(parseGuestArea(JSON.stringify({ area: "X", pincode: "12" })), null);
  });
  test("serviceability is 520xxx and the header address has no street", () => {
    assert.equal(isServiceableAreaPincode("520010"), true);
    assert.equal(isServiceableAreaPincode("560001"), false);
    assert.equal(guestAreaAddress({ area: "Benz Circle", pincode: "520010" }).street, "");
  });
});

describe("the temporary switch REQUIRE_PHONE_SIGN_IN", () => {
  test("is off unless the environment says 'true'", () => {
    const source = read("glowvai-app/features/auth/accountGate.ts");
    assert.match(source, /REQUIRE_PHONE_SIGN_IN: boolean = process.env.NEXT_PUBLIC_REQUIRE_PHONE_SIGN_IN === 'true'/);
  });

  test("off: a guest opens Orders, Account, wishlist, wallet and every other screen", () => {
    for (const screen of ["orders-list", "profile-tab", "shop-wishlist", "wallet-home", "checkout-review", "something-new"]) {
      assert.deepEqual(gateNavigationWith(NONE, { screen, params: { a: 1 } }, false), { screen, params: { a: 1 } }, screen);
    }
  });

  test("off: every guest action is allowed and the first screen is the shop", () => {
    for (const action of ["open-orders", "open-account", "checkout", "place-order", "payment", "start-scan", "unknown-action"]) {
      assert.equal(requiresSignInWith(action, false), false, action);
    }
    assert.equal(startScreenForWith(NONE, false), "shop-home");
    assert.equal(startScreenForWith(PHONE, false), "shop-home");
  });

  test("off: a signed-in account still never sees the sign-in screens", () => {
    assert.deepEqual(gateNavigationWith(PHONE, { screen: "auth-login", params: null }, false), { screen: "shop-home", params: null });
  });

  test("on: the gate is exactly as before (guests are sent to sign-in, actions ask, no empty state)", () => {
    assert.equal(gateNavigationWith(NONE, { screen: "orders-list", params: null }, true).screen, "auth-login");
    assert.equal(requiresSignInWith("open-orders", true), true);
    assert.equal(startScreenForWith(NONE, true), "auth-onboarding");
  });
});
