import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOME_LAYOUT, HOME_BLOCK_IDS, parsePriceBand, readHomeLayout, readProductRows } from "@/lib/shop/homeLayout";

test("nothing saved gives the default order, footer last", () => {
  assert.deepEqual(readHomeLayout(undefined), [...HOME_BLOCK_IDS]);
  assert.equal(DEFAULT_HOME_LAYOUT.length, HOME_BLOCK_IDS.length);
});

test("stored order is followed and switched-off blocks are removed", () => {
  const got = readHomeLayout({
    blocks: [
      { id: "deals", enabled: true, position: 0 },
      { id: "hero", enabled: true, position: 1 },
      { id: "offers", enabled: false, position: 2 },
      { id: "footer", enabled: false, position: 0 },
    ],
  });
  assert.equal(got[0], "deals");
  assert.equal(got[1], "hero");
  assert.ok(!got.includes("offers"));
  assert.equal(got[got.length - 1], "footer");
});

test("unknown and duplicate ids are ignored, footer stays last", () => {
  const got = readHomeLayout({
    blocks: [
      { id: "evil-script", enabled: true, position: 0 },
      { id: "brands", enabled: true, position: 1 },
      { id: "brands", enabled: true, position: 0 },
      { id: "footer", enabled: true, position: 0 },
      { id: "hero", enabled: true, position: 2 },
    ],
  });
  assert.equal(got.filter((x) => x === "brands").length, 1);
  assert.ok(!got.includes("evil-script" as never));
  assert.equal(got[got.length - 1], "footer");
});

test("a block missing from the saved list is added at its default place", () => {
  const got = readHomeLayout({ blocks: [{ id: "hero", enabled: true, position: 0 }] });
  assert.ok(got.includes("trust"));
  assert.equal(got[0], "hero");
});

test("a malformed value gives the default", () => {
  assert.deepEqual(readHomeLayout("nope"), [...HOME_BLOCK_IDS]);
  assert.deepEqual(readHomeLayout({ blocks: "x" }), [...HOME_BLOCK_IDS]);
});



const rowsDoc = (rows: unknown[]) => ({ blocks: [{ id: "product-rails", enabled: true, position: 0, settings: { rows } }] });

test("valid rows are read in order", () => {
  const got = readProductRows(rowsDoc([
    { title: "Serums for you", source: "category", value: "Serums", limit: 6 },
    { title: "Best of brand", source: "brand", value: "Minimalist", limit: 4 },
    { title: "Bestsellers", source: "bestsellers", value: "", limit: 8 },
  ]));
  assert.deepEqual(got.map((r) => r.source), ["category", "brand", "bestsellers"]);
});

test("bad rows are dropped: unknown source, value on bestsellers, limit out of range, empty category", () => {
  const got = readProductRows(rowsDoc([
    { title: "Bad", source: "price", value: "", limit: 6 },
    { title: "Bad", source: "bestsellers", value: "Serums", limit: 6 },
    { title: "Bad", source: "category", value: "Serums", limit: 3 },
    { title: "Bad", source: "category", value: "Serums", limit: 13 },
    { title: "Bad", source: "category", value: "  ", limit: 6 },
    { title: "Good", source: "new", value: "", limit: 4 },
  ]));
  assert.deepEqual(got.map((r) => r.title), ["Good"]);
});

test("more than six rows keeps the first six; no rows gives none", () => {
  const seven = Array.from({ length: 7 }, (_, i) => ({ title: "Row " + i, source: "new", value: "", limit: 4 }));
  assert.equal(readProductRows(rowsDoc(seven)).length, 6);
  assert.deepEqual(readProductRows({ blocks: [] }), []);
});

test("a valid price band is kept with its value", () => {
  const got = readProductRows(rowsDoc([
    { title: "Under 200", source: "price-band", value: "0-199", limit: 6 },
    { title: "Mid", source: "price-band", value: " 200-499 ", limit: 4 },
  ]));
  assert.deepEqual(got.map((r) => [r.source, r.value]), [["price-band", "0-199"], ["price-band", "200-499"]]);
});

test("a reversed, equal, out-of-range or malformed price band is dropped", () => {
  const got = readProductRows(rowsDoc([
    { title: "Reversed", source: "price-band", value: "499-200", limit: 4 },
    { title: "Equal", source: "price-band", value: "200-200", limit: 4 },
    { title: "Too high", source: "price-band", value: "0-50001", limit: 4 },
    { title: "Negative", source: "price-band", value: "-5-100", limit: 4 },
    { title: "Words", source: "price-band", value: "cheap", limit: 4 },
    { title: "Good", source: "price-band", value: "0-50000", limit: 4 },
  ]));
  assert.deepEqual(got.map((r) => r.title), ["Good"]);
  assert.equal(parsePriceBand("0-199")?.max, 199);
  assert.equal(parsePriceBand("199-0"), null);
});

test("price drop is kept with an empty value and dropped with a value", () => {
  const got = readProductRows(rowsDoc([
    { title: "Drops", source: "price-drop", value: "", limit: 6 },
    { title: "Drops with a value", source: "price-drop", value: "0-199", limit: 6 },
  ]));
  assert.deepEqual(got.map((r) => [r.title, r.source, r.value]), [["Drops", "price-drop", ""]]);
});
