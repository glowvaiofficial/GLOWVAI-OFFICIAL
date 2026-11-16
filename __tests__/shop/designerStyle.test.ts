import { test } from "node:test";
import assert from "node:assert/strict";
import { readBlockStyles, readHeroVideo, readLook, sanitizeBlockStyle, sanitizeLook, sanitizeVideoUrl } from "@/lib/shop/layoutStyle";
import { readLayoutResponse } from "@/glowvai-app/features/shop/lib/useHomeLayout";
import { badgeSets, badgesFor, campaignKeys, campaignRawPalette, campaignPalette, countdownLabel, feedbackEnabled, isSoldOut, lowStockLeft, stockBar, stockOf } from "@/glowvai-app/features/shop/lib/designerStyle";
import { isWarmColour } from "@/lib/shop/theme";

const doc = (settings: unknown, id = "hero") => ({ blocks: [{ id, enabled: true, position: 0, settings }] });

test("a block with no style, or an unknown style, reads as no style", () => {
  assert.deepEqual(readBlockStyles(undefined), {});
  assert.deepEqual(readBlockStyles(doc({ title: "x" })), {});
  assert.deepEqual(readBlockStyles(doc({ style: { layout: "wobble", card: "x", motion: "spin" } })), {});
  assert.equal(readLook(undefined), undefined);
  assert.equal(readLook({ look: { campaign: "orange" } }), undefined);
});

test("banner layouts are checked per block family; unknown values are dropped", () => {
  assert.deepEqual(sanitizeBlockStyle("hero", { layout: "story-strip", motion: "stagger" }), { layout: "story-strip", motion: "stagger" });
  assert.equal(sanitizeBlockStyle("hero", { layout: "grid" }), undefined);
  assert.deepEqual(sanitizeBlockStyle("deals", { layout: "grid", card: "quick-add" }), { layout: "grid", card: "quick-add" });
  assert.equal(sanitizeBlockStyle("deals", { layout: "parallax" }), undefined);
  assert.equal(sanitizeBlockStyle("footer", { motion: "fade-in" }), undefined);
  assert.equal(sanitizeBlockStyle("trust", { layout: "grid" }), undefined);
});

test("card, badges and stock bar apply only to product blocks; badges are unique and capped", () => {
  assert.equal(sanitizeBlockStyle("hero", { card: "clean", stockBar: true }), undefined);
  const s = sanitizeBlockStyle("recommended", { badges: ["new", "new", "bogus", "discount", "low-stock", "delivery-time", "sponsored", "bestseller"], stockBar: true });
  assert.deepEqual(s?.badges, ["new", "discount", "low-stock", "delivery-time", "sponsored", "bestseller"]);
  assert.equal(s?.stockBar, true);
});

test("countdown end must be an ISO date; sticky must be a boolean", () => {
  assert.equal(sanitizeBlockStyle("deals", { countdownEndsAt: "soon" }), undefined);
  assert.equal(sanitizeBlockStyle("deals", { countdownEndsAt: "2026-12-01T10:00:00Z" })?.countdownEndsAt, "2026-12-01T10:00:00Z");
  assert.equal(sanitizeBlockStyle("deals", { stickyHeader: "yes" }), undefined);
  assert.equal(sanitizeBlockStyle("deals", { stickyHeader: true })?.stickyHeader, true);
});

test("look keeps known campaign, spinner and boolean switches only", () => {
  assert.deepEqual(sanitizeLook({ campaign: "monsoon", spinner: "dots", feedback: { toast: false, confetti: true, haptics: "yes", other: true } }), { campaign: "monsoon", spinner: "dots", feedback: { toast: false, confetti: true } });
  assert.equal(sanitizeLook({ campaign: "nope", spinner: "spiral", feedback: {} }), undefined);
});

test("hero video must be an https mp4 or webm", () => {
  assert.equal(sanitizeVideoUrl("https://cdn.example.com/a.mp4"), "https://cdn.example.com/a.mp4");
  assert.equal(sanitizeVideoUrl("http://cdn.example.com/a.mp4"), undefined);
  assert.equal(sanitizeVideoUrl("https://cdn.example.com/a.mov"), undefined);
  assert.equal(sanitizeVideoUrl("javascript:alert(1)"), undefined);
  assert.equal(readHeroVideo(doc({ hero: { video: "https://cdn.example.com/a.webm" } })), "https://cdn.example.com/a.webm");
  assert.equal(readHeroVideo(doc({ hero: { video: "ftp://x/a.mp4" } })), undefined);
});

test("the client re-checks the layout reply and defaults to no style", () => {
  const empty = readLayoutResponse({});
  assert.deepEqual(empty.styles, {});
  assert.equal(empty.look, undefined);
  assert.equal(empty.heroVideo, undefined);
  const v = readLayoutResponse({ styles: { hero: { layout: "peek", evil: 1 }, deals: { layout: "parallax" } }, look: { campaign: "sale", spinner: "x" }, heroVideo: "http://x/a.mp4" });
  assert.deepEqual(v.styles, { hero: { layout: "peek" } });
  assert.deepEqual(v.look, { campaign: "sale" });
  assert.equal(v.heroVideo, undefined);
});

test("stock rules use real stock only", () => {
  const p = (stock: number | null | undefined) => ({ stock, variants: undefined });
  assert.equal(stockOf(p(undefined)), null);
  assert.equal(isSoldOut(p(undefined)), false);
  assert.equal(isSoldOut(p(0)), true);
  assert.equal(lowStockLeft(p(3)), 3);
  assert.equal(lowStockLeft(p(6)), null);
  assert.equal(stockBar(p(null)), null);
  assert.equal(stockBar(p(40)), null);
  assert.deepEqual(stockBar(p(4)), { left: 4, pct: 40 });
  assert.equal(stockBar(p(0)), null);
});

test("badges appear only when their real data exists, in the admin's order", () => {
  const prod = { id: "a", deliveryMinutes: 30, rating: 4.8, reviewCount: 9, stock: 2, variants: undefined } as never;
  const sets = badgeSets([prod]);
  const labels = (w: never[], d = 20) => badgesFor(prod, w, sets, d).map((b) => b.label);
  assert.deepEqual(labels(["delivery-time", "discount", "low-stock", "bestseller", "new"] as never[]), ["30 mins", "20% OFF", "Only 2 left", "Bestseller", "New"]);
  const bare = { id: "b", deliveryMinutes: null, rating: null, reviewCount: null, stock: undefined } as never;
  assert.deepEqual(badgesFor(bare, ["delivery-time", "discount", "low-stock", "bestseller"], sets, 0), []);
});

test("countdown shows time left and hides once past", () => {
  const now = Date.parse("2026-12-01T00:00:00Z");
  assert.equal(countdownLabel("2026-12-03T05:00:00Z", now), "2d 5h");
  assert.equal(countdownLabel("2026-12-01T03:12:00Z", now), "3h 12m");
  assert.equal(countdownLabel("2026-11-30T00:00:00Z", now), null);
  assert.equal(countdownLabel("garbage", now), null);
});

test("no campaign palette contains a warm colour, and brand blue is never replaced", () => {
  for (const c of campaignKeys()) {
    const raw = campaignRawPalette(c);
    if (!raw) continue;
    for (const hex of [raw.wash, raw.tint, raw.accent]) assert.equal(isWarmColour(hex), false, `${c} ${hex}`);
    assert.notEqual(campaignPalette(c), null, c);
  }
  assert.equal(campaignPalette("everyday"), null);
  assert.equal(campaignPalette(undefined), null);
});

test("feedback runs only once a look is saved, with the contract defaults", () => {
  assert.equal(feedbackEnabled(undefined, "toast"), false);
  assert.equal(feedbackEnabled({ campaign: "sale" }, "toast"), true);
  assert.equal(feedbackEnabled({ campaign: "sale" }, "confetti"), false);
  assert.equal(feedbackEnabled({ feedback: { toast: false } }, "toast"), false);
});
