// Every settings screen must be registered as a route, and must have a back target: the back control on a full page, or
// the Settings hub it returns to. Read from the source files, so no UI code runs in the test.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APP = join(process.cwd(), "glowvai-app");
const read = (rel: string) => readFileSync(join(APP, rel), "utf8");

// Every route key registered in any features/*/routes.tsx file.
function registeredRoutes(): Set<string> {
  const keys = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "routes.tsx") {
        for (const m of readFileSync(full, "utf8").matchAll(/^\s*'?([a-z][a-z0-9-]*)'?\s*:\s*(?:\(\)\s*=>|[A-Z])/gm)) keys.add(m[1]);
      }
    }
  };
  walk(join(APP, "features"));
  return keys;
}

// Each settings route, the screen file that renders it, and the place its back control returns to.
const SETTINGS_ROUTES: { route: string; file: string; backTo: string }[] = [
  { route: "profile-settings", file: "features/settings/SettingsHubScreen.tsx", backTo: "previous screen in history (the tab it was opened from)" },
  { route: "profile-edit", file: "features/profile/EditProfileScreen.tsx", backTo: "previous screen in history" },
  { route: "settings-language", file: "features/settings/LanguageSettings.tsx", backTo: "settings hub" },
  { route: "settings-notifications", file: "features/settings/NotificationSettings.tsx", backTo: "settings hub" },
  { route: "settings-activity", file: "features/settings/ActivityScreen.tsx", backTo: "settings hub" },
  { route: "help-index", file: "features/settings/HelpScreens.tsx", backTo: "settings hub" },
  { route: "help-faq", file: "features/settings/HelpScreens.tsx", backTo: "help index" },
  { route: "help-terms", file: "features/settings/HelpScreens.tsx", backTo: "help index" },
  { route: "help-privacy", file: "features/settings/HelpScreens.tsx", backTo: "help index" },
  { route: "profile-subscriptions", file: "features/profile/SubscriptionsScreen.tsx", backTo: "previous screen in history" },
  { route: "wallet-home", file: "features/wallet/WalletScreen.tsx", backTo: "previous screen in history" },
  { route: "gift-cards", file: "features/privacy/GiftCardsScreen.tsx", backTo: "previous screen in history" },
  { route: "privacy-center", file: "features/privacy/PrivacyCenterScreen.tsx", backTo: "previous screen in history" },
  { route: "privacy-devices", file: "features/privacy/DevicesScreen.tsx", backTo: "privacy centre" },
  { route: "payment-methods", file: "features/privacy/PaymentMethodsScreen.tsx", backTo: "privacy centre" },
  { route: "settings-sell", file: "features/settings/SettingsLinks.tsx", backTo: "previous screen in history" },
  { route: "settings-affiliate", file: "features/settings/SettingsLinks.tsx", backTo: "previous screen in history" },
];

describe("settings routes", () => {
  const routes = registeredRoutes();

  for (const { route } of SETTINGS_ROUTES) {
    test(`${route} is registered in a routes map`, () => {
      assert.ok(routes.has(route), `${route} has no entry in features/*/routes.tsx`);
    });
  }

  test("every settings route name is a known screen name", () => {
    const names = read("core/routes/names.ts");
    for (const { route } of SETTINGS_ROUTES) {
      assert.ok(names.includes(`'${route}'`), `${route} is not in PortedScreenName`);
    }
  });

  for (const { route, file, backTo } of SETTINGS_ROUTES) {
    test(`${route} has a back target (${backTo})`, () => {
      const source = read(file);
      const usesFrame = /SettingsPage|ProfileHeader|SettingsWebPage|PlaceholderBody|SettingsHubScreen/.test(source);
      assert.ok(usesFrame, `${file} does not render the settings or profile frame`);
    });
  }

  test("the settings hub back control goes back", () => {
    assert.match(read("features/settings/SettingsHubScreen.tsx"), /onClick=\{goBack\}/);
  });

  test("a full-page settings screen gets a back control by default", () => {
    const parts = read("features/settings/SettingsParts.tsx");
    assert.match(parts, /const back = onBack \?\? goBack;/);
    assert.match(parts, /\{!embedded && \(\s*<button[^>]*onClick=\{back\}/);
  });
});

describe("checkout back controls", () => {
  test("review, payment and bag go back the way the browser Back does, not by pushing a new step", () => {
    for (const file of ["features/commerce/CheckoutReviewScreen.tsx", "features/commerce/PaymentMethodScreen.tsx", "features/commerce/CartScreen.tsx"]) {
      assert.doesNotMatch(read(file), /onBack=\{\(\) => navigate\(/, `${file} pushes a step from its back control`);
    }
  });
});
