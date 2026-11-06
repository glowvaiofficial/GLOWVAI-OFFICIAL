import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { rankSuggestions, scoreSuggestion, type SuggestSource } from "../../lib/shop/suggest";
import { RECENT_MAX, cleanRecent, pushRecent } from "../../lib/shop/recent";

const p = (id: string, name: string, brand: string): SuggestSource => ({ id, name, brand });
const catalog: SuggestSource[] = [
  p("1", "Niacinamide 10% Serum", "The Ordinary"),
  p("2", "Vitamin C Brightening Serum", "Minimalist"),
  p("3", "Daily Sunscreen SPF 50", "Re'equil"),
  p("4", "Hydrating Gel Cream", "Neutrogena"),
  p("5", "Salicylic Acid Cleanser", "Minimalist"),
  p("6", "Ceramide Barrier Moisturiser", "CeraVe"),
  p("7", "Niacinamide Night Cream", "Nykaa Skin"),
  p("8", "Retinol Night Serum", "Minimalist"),
];

describe("search suggestions ranking", () => {
  test("an empty or blank query suggests nothing", () => {
    assert.deepEqual(rankSuggestions(catalog, ""), []);
    assert.deepEqual(rankSuggestions(catalog, "   "), []);
  });

  test("a name that starts with the query ranks above one that only contains it", () => {
    const ids = rankSuggestions(catalog, "niacinamide").map((x) => x.id);
    assert.deepEqual(ids.slice(0, 2), ["1", "7"]);
  });

  test("a brand match is found and ranks below a name match", () => {
    const r = rankSuggestions(catalog, "minimalist");
    assert.ok(r.length >= 3);
    assert.ok(r.every((x) => x.brand === "Minimalist"));
    assert.equal(scoreSuggestion(catalog[1], "minimalist") < scoreSuggestion(catalog[1], "vitamin"), true);
  });

  test("returns at most six matches", () => {
    const many = Array.from({ length: 12 }, (_, i) => p(`x${i}`, `Serum number ${i}`, "Brand"));
    assert.equal(rankSuggestions(many, "serum").length, 6);
    assert.equal(rankSuggestions(many, "serum", 3).length, 3);
  });

  test("words in any order still match when each word starts a word", () => {
    assert.deepEqual(rankSuggestions(catalog, "serum vit").map((x) => x.id), ["2"]);
  });

  test("a query with no match gives no suggestions", () => {
    assert.deepEqual(rankSuggestions(catalog, "zzzz"), []);
  });

  test("the same product is never suggested twice", () => {
    const dupes = [catalog[0], catalog[0], catalog[1]];
    assert.deepEqual(rankSuggestions(dupes, "niacinamide").map((x) => x.id), ["1"]);
  });

  test("matching ignores case and extra spaces", () => {
    assert.equal(rankSuggestions(catalog, "  VITAMIN   c ")[0].id, "2");
  });
});

describe("recently viewed (device, ids only)", () => {
  test("the newest view comes first and repeats move to the front", () => {
    let list: string[] = [];
    for (const id of ["a", "b", "c", "a"]) list = pushRecent(list, id);
    assert.deepEqual(list, ["a", "c", "b"]);
  });

  test("at most twenty ids are kept", () => {
    let list: string[] = [];
    for (let i = 0; i < 30; i += 1) list = pushRecent(list, `p${i}`);
    assert.equal(list.length, RECENT_MAX);
    assert.equal(list[0], "p29");
  });

  test("stored values that are not valid ids are ignored when read back", () => {
    assert.deepEqual(cleanRecent(["ok", 5, { name: "pii" }, "bad id", "ok"]), ["ok"]);
    assert.deepEqual(cleanRecent("nope"), []);
    assert.deepEqual(pushRecent(["ok"], "bad id"), ["ok"]);
  });
});
