import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

// The media block that starts at `query` and contains the rule text (brace-matched, so nested rules are included).
function mediaBlock(query: string): string {
  const start = css.indexOf(`@media ${query}`);
  if (start < 0) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return "";
}

describe("global layout CSS", () => {
  test("defines one page gutter: 16px phone, 24px tablet, 32px desktop", () => {
    assert.match(css, /:root\s*\{[^}]*--gv-gutter:\s*16px/);
    assert.match(mediaBlock("(min-width: 720px)"), /--gv-gutter:\s*24px/);
    assert.match(mediaBlock("(min-width: 1024px)"), /--gv-gutter:\s*32px/);
  });

  test("caps the page column at 1200px and applies the gutter on both sides", () => {
    assert.match(css, /--gv-max:\s*1200px/);
    const page = css.slice(css.indexOf(".gv-page {"), css.indexOf(".gv-page {") + 300);
    assert.match(page, /max-width:\s*var\(--gv-max\)/);
    assert.match(page, /padding-inline:\s*var\(--gv-gutter\)/);
    assert.match(page, /box-sizing:\s*border-box/);
  });

  test("sizes every element from its border box", () => {
    assert.match(css, /\*,\s*\*::before,\s*\*::after\s*\{\s*box-sizing:\s*border-box/);
  });

  test("constrains images, video and tables to the screen width", () => {
    assert.match(css, /img,\s*video,\s*canvas,\s*svg,\s*iframe\s*\{\s*max-width:\s*100%/);
    assert.match(css, /table\s*\{\s*max-width:\s*100%/);
    assert.match(css, /\.gv-table-scroll\s*\{[^}]*overflow-x:\s*auto/);
  });

  test("gives phone text fields a 16px font so iOS does not zoom on focus", () => {
    const phone = mediaBlock("(max-width: 767px)");
    assert.match(phone, /input:not\(\[type="checkbox"\]\)[^{]*\{/);
    assert.match(phone, /select,\s*textarea\s*\{\s*font-size:\s*16px\s*!important/);
  });

  test("makes phone buttons at least 44px high", () => {
    assert.match(mediaBlock("(max-width: 767px)"), /button,[\s\S]*min-height:\s*44px/);
  });

  test("keeps zoom allowed (no user-scalable=no in the root viewport)", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    assert.doesNotMatch(layout, /user-scalable\s*[:=]\s*(false|no|0)/i);
    assert.doesNotMatch(layout, /maximumScale:\s*1\b/);
  });
});
