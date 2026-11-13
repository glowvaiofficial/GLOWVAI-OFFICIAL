import { test } from "node:test";
import assert from "node:assert/strict";
import { activePreset, orderWithPreset, readPreset, themeWithPreset, type HomePreset } from "@/lib/shop/presets";
import { DEFAULT_THEME } from "@/lib/shop/theme";

const NOW = 1_800_000_000_000;
const base = { name: "Diwali", startsAt: NOW - 1000, endsAt: NOW + 1000, enabled: true, updatedAt: NOW, updatedBy: "x" };

test("a preset needs a name, a valid window, and at least a theme or an order", () => {
  assert.ok(readPreset("diwali-2026", { ...base, theme: { brand: "#ff6600" } }));
  assert.equal(readPreset("diwali-2026", { ...base, theme: null, blockOrder: null }), null);
  assert.equal(readPreset("diwali-2026", { ...base, endsAt: base.startsAt }), null);
  assert.equal(readPreset("BAD ID", { ...base, theme: { brand: "#ff6600" } }), null);
});

test("bad colours, unknown fonts, unknown or repeated blocks are refused", () => {
  assert.equal(readPreset("diwali-2026", { ...base, theme: { brand: "orange" } }), null);
  assert.equal(readPreset("diwali-2026", { ...base, theme: { headingFont: "comic" } }), null);
  assert.equal(readPreset("diwali-2026", { ...base, blockOrder: ["hero", "not-a-block"] }), null);
  assert.equal(readPreset("diwali-2026", { ...base, blockOrder: ["hero", "hero"] }), null);
  assert.equal(readPreset("diwali-2026", { ...base, blockOrder: ["hero", "footer"] }), null);
});

test("the live preset is the enabled one inside its window with the latest start", () => {
  const older = readPreset("older-one-1", { ...base, startsAt: NOW - 5000, theme: { brand: "#111111" } }) as HomePreset;
  const newer = readPreset("newer-one-1", { ...base, startsAt: NOW - 2000, theme: { brand: "#222222" } }) as HomePreset;
  const off = readPreset("off-one-1", { ...base, enabled: false, theme: { brand: "#333333" } }) as HomePreset;
  const ended = readPreset("ended-1-1", { ...base, startsAt: NOW - 9000, endsAt: NOW - 1, theme: { brand: "#444444" } }) as HomePreset;
  assert.equal(activePreset([older, newer, off, ended], NOW)?.id, "newer-one-1");
  assert.equal(activePreset([off, ended], NOW), null);
});

test("a preset lays only its own colours over the published theme", () => {
  const p = readPreset("diwali-2026", { ...base, theme: { brand: "#ff6600" } }) as HomePreset;
  const t = themeWithPreset(DEFAULT_THEME, p);
  assert.equal(t.brand, "#ff6600");
  assert.equal(t.ink, DEFAULT_THEME.ink);
  assert.equal(themeWithPreset(DEFAULT_THEME, null), DEFAULT_THEME);
});

test("a preset order replaces the list and the footer stays last", () => {
  const p = readPreset("diwali-2026", { ...base, blockOrder: ["offers", "hero"] }) as HomePreset;
  assert.deepEqual(orderWithPreset(["hero", "footer"], p), ["offers", "hero", "footer"]);
  assert.deepEqual(orderWithPreset(["hero", "footer"], null), ["hero", "footer"]);
});
