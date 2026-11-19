// The PC account menu: every item opens a screen that exists, every screen listed under an item is routed (or handled by
// App.tsx), no screen belongs to two items, and the content area is never replaced by a sign-in wall while the gate is off.
// Read from the source files, so no UI code runs in the test.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APP = join(process.cwd(), "glowvai-app");
const read = (rel: string) => readFileSync(join(APP, rel), "utf8");

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

const menu = read("components/common/AccountMenu.tsx");
const items = [...menu.matchAll(/label: '([^']+)', target: '([^']+)'.*?screens: \[([^\]]*)\]/g)].map((m) => ({
  label: m[1],
  target: m[2],
  screens: [...m[3].matchAll(/'([^']+)'/g)].map((s) => s[1]),
}));
const names = read("core/routes/names.ts");
const app = read("App.tsx");
const appCases = new Set([...app.matchAll(/case '([a-z0-9-]+)':/g)].map((m) => m[1]));

describe("account menu routing", () => {
  test("the menu lists 13 items", () => assert.equal(items.length, 13));

  test("every item target is a routed screen and belongs to its own item", () => {
    const routes = registeredRoutes();
    for (const item of items) {
      assert.ok(routes.has(item.target), `${item.label}: ${item.target} is not in any routes file`);
      assert.ok(item.screens.includes(item.target), `${item.label}: ${item.target} is not highlighted for itself`);
    }
  });

  test("every screen listed under an item is a real screen name that renders", () => {
    const routes = registeredRoutes();
    for (const item of items) {
      for (const screen of item.screens) {
        assert.ok(routes.has(screen) || appCases.has(screen), `${item.label}: ${screen} renders nothing (falls to the shop home)`);
        assert.ok(names.includes(`'${screen}'`) || appCases.has(screen), `${item.label}: ${screen} is not a known screen name`);
      }
    }
  });

  test("no screen is claimed by two menu items", () => {
    const seen = new Map<string, string>();
    for (const item of items) {
      for (const screen of item.screens) {
        assert.equal(seen.get(screen), undefined, `${screen} is under both ${seen.get(screen)} and ${item.label}`);
        seen.set(screen, item.label);
      }
    }
  });

  test("with the gate off no sign-in wall replaces an account screen, and the greeting never invents a name", () => {
    assert.ok(!/SignInPrompt|needsProfileEmptyState/.test(app));
    assert.ok(/'guest'/.test(menu) && !/Your account/.test(menu));
  });
});
