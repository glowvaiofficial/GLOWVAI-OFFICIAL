import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOME_LAYOUT, HOME_BLOCK_IDS, readHomeLayout } from "@/lib/shop/homeLayout";

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
