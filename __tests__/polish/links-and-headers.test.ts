import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("unknown /shop paths are a real 404, not the home screen", () => {
  const src = read("app/shop/[[...slug]]/page.tsx");
  assert.match(src, /export const dynamicParams = false/);
  assert.match(src, /slug: \[\]/);
});

test("the /concerns index exists and lists every concern page", () => {
  const src = read("app/concerns/page.tsx");
  assert.match(src, /concernPages\.map/);
  assert.match(src, /\/concerns\/\$\{c\.slug\}/);
});

test("the framework header is switched off", () => {
  assert.match(read("next.config.js"), /poweredByHeader: false/);
});

test("Escape skips the onboarding intro", () => {
  const src = read("glowvai-app/screens/OnboardingScreen.tsx");
  assert.match(src, /event\.key === 'Escape'\) skip\(\)/);
  assert.match(src, /removeEventListener\('keydown'/);
});
