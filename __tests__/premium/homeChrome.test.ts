import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  FOR_YOU_ACCENT,
  HOME_TABS,
  activeOrder,
  ctaLabelForLink,
  deliveryCell,
  endsInText,
  etaLabel,
  greetingLine,
  homeTab,
  matchesConcern,
  safeInternalLink,
  soonestLiveSale,
} from "../../glowvai-app/features/shop/mobile/homeChrome";
import {
  accentTextOn,
  accentTheme,
  accentVars,
  contrastRatio,
  itemAccent,
  mix,
  readableTextOn,
  sectionAccent,
  tintOf,
} from "../../glowvai-app/features/shop/mobile/accentTheme";
import { GLOWVAI_ACCENTS } from "../../lib/shop/accents";

describe("mobile home header tabs", () => {
  test("For You first, one tab per concern, All categories last", () => {
    assert.equal(HOME_TABS[0].id, "for-you");
    assert.equal(HOME_TABS[0].accent, FOR_YOU_ACCENT);
    assert.equal(HOME_TABS[HOME_TABS.length - 1].id, "all");
    assert.deepEqual(
      HOME_TABS.filter((t) => t.concern).map((t) => t.concern),
      ["acne", "hydration", "brightening", "antiaging", "barrier"],
    );
  });

  test("concern tabs take the default palette in order", () => {
    const concerns = HOME_TABS.filter((t) => t.concern);
    concerns.forEach((t, i) => assert.equal(t.accent, GLOWVAI_ACCENTS[i]));
  });

  test("'all' and unknown ids fall back to For You", () => {
    assert.equal(homeTab("all").id, "for-you");
    assert.equal(homeTab("nope").id, "for-you");
    assert.equal(homeTab(null).id, "for-you");
    assert.equal(homeTab("hydration").concern, "hydration");
  });

  test("a concern matches on name, description or actives, like the browse filter", () => {
    assert.ok(matchesConcern({ name: "Salicylic Face Wash" }, "acne"));
    assert.ok(matchesConcern({ name: "Gel", keyActives: ["Hyaluronic acid"] }, "hydration"));
    assert.ok(!matchesConcern({ name: "Plain Gel", description: "", keyActives: [] }, "acne"));
    assert.ok(matchesConcern({ name: "Anything" }, null));
    assert.ok(matchesConcern({ name: "Anything" }, "unknown-concern"));
  });
});

describe("greeting card", () => {
  test("first name only, cleaned", () => {
    assert.equal(greetingLine("Priya Sharma"), "Hi, Priya");
    assert.equal(greetingLine("  "), "Hi there");
    assert.equal(greetingLine(null), "Hi there");
    assert.equal(greetingLine("<b>Ravi</b>"), "Hi, bRavib");
    assert.equal(greetingLine("12345"), "Hi there");
  });

  test("delivery cell: the estimate, else the area, else nothing", () => {
    assert.equal(etaLabel(14.6), "~ 15 mins");
    assert.equal(etaLabel(0), null);
    assert.equal(etaLabel(Number.NaN), null);
    assert.deepEqual(deliveryCell(20, "Benz Circle, Vijayawada"), { title: "Delivery in", value: "~ 20 mins" });
    assert.deepEqual(deliveryCell(null, "Benz Circle, Vijayawada"), { title: "Delivering to", value: "Benz Circle" });
    assert.equal(deliveryCell(null, ""), null);
  });

  test("Track Order follows the newest order still on its way", () => {
    const orders = [
      { orderId: "a", status: "DELIVERED", createdAt: 30 },
      { orderId: "b", status: "PLACED", createdAt: 10 },
      { orderId: "c", status: "out_for_delivery", createdAt: 20 },
      { orderId: "d", status: "CANCELLED", createdAt: 40 },
    ];
    assert.equal(activeOrder(orders)?.orderId, "c");
    assert.equal(activeOrder([{ orderId: "x", status: "DELIVERED", createdAt: 1 }]), null);
    assert.equal(activeOrder(null), null);
  });
});

describe("flash deals countdown", () => {
  test("hours and minutes, rounded up, never negative", () => {
    assert.equal(endsInText(84 * 60_000), "01h : 24m");
    assert.equal(endsInText(30_000), "00h : 01m");
    assert.equal(endsInText(-5), "00h : 00m");
    assert.equal(endsInText(Number.NaN), "00h : 00m");
  });

  test("the soonest live sale puts its countdown on the title", () => {
    const sales = [{ endsAt: 500 }, { endsAt: 200 }, { endsAt: 50 }];
    assert.equal(soonestLiveSale(sales, 100)?.endsAt, 200);
    assert.equal(soonestLiveSale(sales, 600), null);
    assert.equal(soonestLiveSale(undefined, 0), null);
  });
});

describe("banner buttons and links", () => {
  test("button text from where the card leads", () => {
    assert.equal(ctaLabelForLink("/shop/plus"), "Join now");
    assert.equal(ctaLabelForLink("/help"), "Get help");
    assert.equal(ctaLabelForLink("/gift-cards"), "Send a gift");
    assert.equal(ctaLabelForLink("/refer"), "Invite");
    assert.equal(ctaLabelForLink(""), "Explore");
  });

  test("only same-site paths are followed", () => {
    assert.equal(safeInternalLink("/shop/category"), "/shop/category");
    assert.equal(safeInternalLink("//evil.example"), null);
    assert.equal(safeInternalLink("https://evil.example"), null);
    assert.equal(safeInternalLink(undefined), null);
  });
});

describe("accent colours stay readable", () => {
  test("mix and tint", () => {
    assert.equal(mix("#000000", "#FFFFFF", 0.5), "#808080");
    assert.equal(mix("bad", "#123456", 0.5), "#123456");
    assert.equal(tintOf("#7C3AED", 0, "#FFFFFF"), "#FFFFFF");
  });

  test("text on any accent reaches 4.5:1", () => {
    for (const accent of [...GLOWVAI_ACCENTS, "#FFFF00", "#00FFFF", "#777777"]) {
      const t = accentTheme(accent);
      assert.ok(contrastRatio(t.text, t.tint) >= 4.5, `text on tint for ${accent}`);
      assert.ok(contrastRatio("#FFFFFF", t.gradient[0]) >= 4.5, `white on gradient for ${accent}`);
      assert.ok(contrastRatio(accentTextOn(accent), "#FFFFFF") >= 4.5, `accent text on white for ${accent}`);
      const on = readableTextOn(accent);
      assert.ok(on === "#FFFFFF" || on === "#1E293B");
    }
  });

  test("a bad accent falls back to ink, never to a broken colour", () => {
    assert.equal(accentTheme("red").accent, "#1E293B");
    assert.match(accentVars("#zzz")["--ac-tint"], /^#[0-9A-F]{6}$/);
  });

  test("section and item accents: the admin's, else the defaults", () => {
    assert.equal(sectionAccent("deals", "#abcdef"), "#ABCDEF");
    assert.equal(sectionAccent("deals", ""), "#F43F5E");
    assert.equal(sectionAccent("offers", "nope"), "#C026D3");
    assert.equal(itemAccent({ accent: "#112233", label: "Serums" }, 3), "#112233");
    assert.equal(itemAccent({ label: "Serums" }, 3), "#7C3AED");
    assert.equal(itemAccent({ label: "Something" }, 9), GLOWVAI_ACCENTS[1]);
  });
});
