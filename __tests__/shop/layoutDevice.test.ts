import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chooseLayoutSource, hasLayoutBlocks, readBlockSettings, readFooterDetails, readHomeLayout, readLayoutDevice } from "@/lib/shop/homeLayout";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const routeSource = readFileSync(join(root, "app/api/shop/layout/route.ts"), "utf8");

const layout = (first: string, extra: Record<string, unknown> = {}) => ({
  blocks: [
    { id: first, enabled: true, position: 0 },
    { id: "footer", enabled: true, position: 1, settings: { footer: { companyLine: `${first} footer` } } },
  ],
  ...extra,
});

const MOBILE_PUBLISHED = layout("deals");
const MOBILE_DRAFT = layout("brands");
const DESKTOP_PUBLISHED = layout("categories");
const DESKTOP_DRAFT = layout("trust");

describe("layout device parameter", () => {
  test("no device means mobile (the native app sends none)", () => {
    assert.equal(readLayoutDevice([]), "mobile");
  });
  test("desktop and mobile are accepted exactly", () => {
    assert.equal(readLayoutDevice(["desktop"]), "desktop");
    assert.equal(readLayoutDevice(["mobile"]), "mobile");
  });
  test("anything else is refused", () => {
    for (const bad of ["", "Desktop", "DESKTOP", "tablet", " desktop", "desktop ", "desktop,mobile", "1", "<script>"]) {
      assert.equal(readLayoutDevice([bad]), null, bad);
    }
    assert.equal(readLayoutDevice(["desktop", "desktop"]), null);
    assert.equal(readLayoutDevice(["desktop", "mobile"]), null);
  });
});

describe("a usable saved layout", () => {
  test("needs a blocks list naming a known block", () => {
    assert.equal(hasLayoutBlocks(DESKTOP_PUBLISHED), true);
    assert.equal(hasLayoutBlocks(undefined), false);
    assert.equal(hasLayoutBlocks(null), false);
    assert.equal(hasLayoutBlocks("blocks"), false);
    assert.equal(hasLayoutBlocks({}), false);
    assert.equal(hasLayoutBlocks({ blocks: [] }), false);
    assert.equal(hasLayoutBlocks({ blocks: "hero" }), false);
    assert.equal(hasLayoutBlocks({ blocks: [{ id: "evil" }, null, 4] }), false);
  });
});

describe("which layout is served", () => {
  const doc = { draft: MOBILE_DRAFT, published: MOBILE_PUBLISHED, desktop: { draft: DESKTOP_DRAFT, published: DESKTOP_PUBLISHED } };

  test("mobile is exactly today's behaviour, whatever desktop holds", () => {
    assert.deepEqual(chooseLayoutSource(doc, "mobile", false), { source: MOBILE_PUBLISHED, footerSource: MOBILE_PUBLISHED, fallback: false });
    assert.deepEqual(chooseLayoutSource(doc, "mobile", true), { source: MOBILE_DRAFT, footerSource: MOBILE_DRAFT, fallback: false });
  });

  test("desktop serves desktop.published", () => {
    const got = chooseLayoutSource(doc, "desktop", false);
    assert.equal(got.source, DESKTOP_PUBLISHED);
    assert.equal(got.fallback, false);
    assert.equal(readHomeLayout(got.source)[0], "categories");
  });

  test("desktop never serves the desktop draft without a preview", () => {
    const got = chooseLayoutSource({ ...doc, desktop: { draft: DESKTOP_DRAFT } }, "desktop", false);
    assert.equal(got.source, MOBILE_PUBLISHED);
    assert.equal(got.fallback, true);
  });

  test("desktop falls back to the mobile published layout when no desktop layout is saved", () => {
    for (const desktop of [undefined, null, "x", {}, { published: null }, { published: { blocks: [] } }, { published: { blocks: [{ id: "nope" }] } }]) {
      const got = chooseLayoutSource({ ...doc, desktop }, "desktop", false);
      assert.equal(got.source, MOBILE_PUBLISHED, JSON.stringify(desktop));
      assert.equal(got.fallback, true);
    }
  });

  test("desktop preview: desktop.draft, else desktop.published, else the mobile draft", () => {
    assert.deepEqual(chooseLayoutSource(doc, "desktop", true), { source: DESKTOP_DRAFT, footerSource: MOBILE_DRAFT, fallback: false });
    const noDraft = chooseLayoutSource({ ...doc, desktop: { published: DESKTOP_PUBLISHED } }, "desktop", true);
    assert.equal(noDraft.source, DESKTOP_PUBLISHED);
    assert.equal(noDraft.fallback, false);
    const none = chooseLayoutSource({ draft: MOBILE_DRAFT, published: MOBILE_PUBLISHED }, "desktop", true);
    assert.equal(none.source, MOBILE_DRAFT);
    assert.equal(none.fallback, true);
  });

  test("the footer details always come from the mobile layout", () => {
    const got = chooseLayoutSource(doc, "desktop", false);
    assert.equal(readFooterDetails(got.footerSource).companyLine, "deals footer");
    const preview = chooseLayoutSource(doc, "desktop", true);
    assert.equal(readFooterDetails(preview.footerSource).companyLine, "brands footer");
  });

  test("desktop block settings are the desktop layout's own", () => {
    const desk = { blocks: [{ id: "trust", enabled: true, position: 0, settings: { title: "PC", items: [{ label: "Fast", sub: "", link: "" }] } }] };
    const got = chooseLayoutSource({ published: MOBILE_PUBLISHED, desktop: { published: desk } }, "desktop", false);
    assert.equal(readBlockSettings(got.source).trust?.title, "PC");
  });

  test("a missing document serves the default layout, with fallback for desktop", () => {
    assert.deepEqual(chooseLayoutSource(undefined, "mobile", false), { source: undefined, footerSource: undefined, fallback: false });
    assert.deepEqual(chooseLayoutSource(undefined, "desktop", false), { source: undefined, footerSource: undefined, fallback: true });
  });
});

describe("the layout route", () => {
  test("validates device before reading anything and answers 400", () => {
    assert.match(routeSource, /readLayoutDevice\(req\.nextUrl\.searchParams\.getAll\("device"\)\)/);
    assert.match(routeSource, /if \(!device\) return json\([^)]*\}, 400\)/);
    assert.ok(routeSource.indexOf("readLayoutDevice") < routeSource.indexOf("db()"));
  });
  test("keeps the rate limit and the caching headers", () => {
    assert.match(routeSource, /limitByIp\(req, "shop-home-layout", 120\)/);
    assert.ok(routeSource.includes('"public, max-age=0, s-maxage=60, stale-while-revalidate=120"'));
    assert.ok(routeSource.includes('"private, no-store"'));
  });
  test("returns device and fallback, with the footer from the mobile layout", () => {
    assert.match(routeSource, /device, fallback \}/);
    assert.match(routeSource, /readFooterDetails\(footerSource\)/);
  });
});
