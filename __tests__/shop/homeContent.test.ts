import { test } from "node:test";
import assert from "node:assert/strict";
import { activeSections, isSafeLink, readSection, type HomeSection } from "@/lib/shop/homeContent";

const NOW = 1_800_000_000_000;

const good = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "diwali-2026",
  kind: "banner",
  title: "Diwali glow sale",
  subtitle: "Up to 40% off",
  ctaLabel: "Shop now",
  link: "/shop",
  image: "",
  background: "#0861f7",
  textColor: "#ffffff",
  startsAt: null,
  endsAt: null,
  enabled: true,
  position: 1,
  ...over,
});

test("a complete section is accepted", () => {
  const s = readSection(good());
  assert.ok(s);
  assert.equal(s.kind, "banner");
});

test("internal links only: scheme, protocol-relative and backslash links are refused", () => {
  assert.equal(isSafeLink("/shop"), true);
  assert.equal(isSafeLink("https://evil.example"), false);
  assert.equal(isSafeLink("//evil.example"), false);
  assert.equal(isSafeLink("/\\evil.example"), false);
  assert.equal(isSafeLink("javascript:alert(1)"), false);
  assert.equal(isSafeLink("/shop with space"), false);
  assert.equal(readSection(good({ link: "//evil.example" })), null);
});

test("colours must be six-digit hex", () => {
  assert.equal(readSection(good({ background: "red" })), null);
  assert.equal(readSection(good({ textColor: "#fff" })), null);
});

test("an end time before the start time is refused", () => {
  assert.equal(readSection(good({ startsAt: NOW, endsAt: NOW - 1 })), null);
});

test("ids must be lower-case slugs of 8 to 40 characters", () => {
  assert.equal(readSection(good({ id: "Bad Id!" })), null);
  assert.equal(readSection(good({ id: "short" })), null);
});

test("images must be small web or jpeg or png data URLs", () => {
  assert.equal(readSection(good({ image: "data:image/svg+xml;base64,PHN2Zz4=" })), null);
  assert.equal(readSection(good({ image: "https://example.com/a.png" })), null);
  assert.equal(readSection(good({ image: `data:image/webp;base64,${"A".repeat(300_001)}` })), null);
  assert.ok(readSection(good({ image: "data:image/webp;base64,QUJD" })));
});

test("only sections that are on and inside their window are shown, in order", () => {
  const list = [
    good({ id: "later-banner", position: 3, startsAt: NOW + 60_000 }),
    good({ id: "ended-banner", position: 0, endsAt: NOW - 1 }),
    good({ id: "off-banner", position: 0, enabled: false }),
    good({ id: "live-banner-b", position: 2 }),
    good({ id: "live-banner-a", position: 1, startsAt: NOW - 1000, endsAt: NOW + 1000 }),
  ];
  const shown: HomeSection[] = activeSections(list, NOW);
  assert.deepEqual(shown.map((s) => s.id), ["live-banner-a", "live-banner-b"]);
});

test("a banner starts exactly at its start time", () => {
  const list = [good({ id: "noon-banner", startsAt: NOW })];
  assert.equal(activeSections(list, NOW - 1).length, 0);
  assert.equal(activeSections(list, NOW).length, 1);
});

test("malformed or non-array input gives an empty list, not an error", () => {
  assert.deepEqual(activeSections(undefined, NOW), []);
  assert.deepEqual(activeSections("nope", NOW), []);
  assert.deepEqual(activeSections([null, 42, good({ id: "x" })], NOW), []);
});

test("at most twenty sections are read", () => {
  const many = Array.from({ length: 30 }, (_, i) => good({ id: `section-${String(i).padStart(3, "0")}`, position: i % 900 }));
  assert.equal(activeSections(many, NOW).length, 20);
});
