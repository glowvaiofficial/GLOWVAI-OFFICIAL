import { test } from "node:test";
import assert from "node:assert/strict";
import { readSettingsMap } from "@/glowvai-app/features/shop/lib/useHomeLayout";

// A picture the admin saves is a base64 data URL tens of thousands of characters long. It was cut to 1000 characters, so the browser showed a broken image.
test("an item picture of 45,000 characters is kept whole", () => {
  const image = "data:image/webp;base64," + "A".repeat(45_000);
  const map = readSettingsMap({ "mini-banners": { title: "", background: "", textColor: "", items: [{ label: "Gel", sub: "New", link: "/shop", image }] } });
  assert.equal(map["mini-banners"]?.items[0]?.image.length, image.length);
});
