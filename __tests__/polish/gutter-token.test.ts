import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// Every source file under a folder, as repo-relative paths with forward slashes.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = dir + "/" + name;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel));
    else if (name.endsWith(".tsx") || name.endsWith(".ts") || name.endsWith(".css")) out.push(rel);
  }
  return out;
}

// Site pages and the chrome they share (navbar, footer, announcement bar, sections). They take the gutter from the token.
const SITE_PAGE_FILES = [
  "app/page.tsx",
  "app/faq/page.tsx",
  "app/terms/page.tsx",
  "app/privacy/page.tsx",
  "app/help/page.tsx",
  "app/help/[topic]/page.tsx",
  "app/sell/page.tsx",
  "app/affiliate/page.tsx",
];
const SITE_CHROME_DIRS = ["components/layout", "components/home", "components/pages"];

const globals = read("app/globals.css");
const shell = read("glowvai-app/responsive/shell.css");
const shopDesignSystem = read("glowvai-app/glowvai.css");

// The --gv-gutter value of the :root rule (query null) or of the media block with this query.
function gutterIn(query: string | null): string | null {
  const scope = query === null ? globals : globals.slice(globals.indexOf(`@media ${query}`));
  const m = scope.match(/:root\s*\{[^}]*--gv-gutter:\s*([0-9.]+px)/);
  return m ? m[1] : null;
}

describe("one site gutter token", () => {
  test("the token is defined once: 16px on phones, 24px from 720px, 32px from 1024px", () => {
    assert.equal(gutterIn(null), "16px");
    assert.equal(gutterIn("(min-width: 720px)"), "24px");
    assert.equal(gutterIn("(min-width: 1024px)"), "32px");
    const declarations = globals.match(/--gv-gutter:\s*[0-9.]+px/g) ?? [];
    assert.equal(declarations.length, 3, "only :root and the two media blocks may set --gv-gutter");
  });

  test("the shop shell and the shop screens read the token instead of their own values", () => {
    assert.match(shell, /--shell-gutter:\s*var\(--gv-gutter\)/);
    assert.doesNotMatch(shell, /--shell-gutter:\s*\d/);
    assert.match(shopDesignSystem, /--ds-gutter:\s*var\(--gv-gutter\)/);
    assert.doesNotMatch(shopDesignSystem, /--ds-gutter:\s*\d/);
  });

  test("the page column (.gv-page) applies the token on both sides and the shared max width", () => {
    const i = globals.indexOf(".gv-page {");
    const rule = globals.slice(i, globals.indexOf("}", i));
    assert.match(rule, /padding-inline:\s*var\(--gv-gutter\)/);
    assert.match(rule, /max-width:\s*var\(--gv-max\)/);
  });

  test("no file declares a second gutter value, and every gutter variable read is the token or an alias of it", () => {
    const files = [...walk("app"), ...walk("components"), ...walk("glowvai-app")];
    const aliases = new Set(["gv-gutter", "shell-gutter", "ds-gutter"]);
    for (const f of files) {
      const src = read(f);
      const drift = src.match(/--(?!gv-gutter\b)[a-z-]*gutter:\s*\d[^;\n]*/);
      assert.equal(drift, null, `${f} declares its own gutter value: ${drift?.[0]}`);
      for (const m of src.matchAll(/var\(--([a-z-]*gutter)\)/g)) {
        assert.ok(aliases.has(m[1]), `${f} reads --${m[1]}, which is not the gutter token`);
      }
    }
  });

  test("site pages and their shared chrome take side padding from the token only", () => {
    const files = [...SITE_PAGE_FILES, ...SITE_CHROME_DIRS.flatMap((d) => walk(d))].filter((f) => f.endsWith(".tsx"));
    for (const f of files) {
      read(f)
        .split("\n")
        .forEach((line, n) => {
          // A page container: a max width and side padding on the same element.
          const container = /max-w-\[?\w/.test(line) && /(^|[\s"`])px-(\d|\[)/.test(line);
          // Responsive side padding anywhere in the site chrome or the page sections.
          const responsive = /(sm|md|lg|xl):px-\d/.test(line);
          assert.ok(!container, `${f}:${n + 1} hard-codes side padding on a page container: ${line.trim().slice(0, 120)}`);
          assert.ok(!responsive, `${f}:${n + 1} hard-codes responsive side padding: ${line.trim().slice(0, 120)}`);
        });
    }
  });

  test("the navbar, footer and sections use the shared page column", () => {
    for (const f of ["components/layout/Navbar.tsx", "components/layout/Footer.tsx", "components/home/shared.tsx"]) {
      assert.match(read(f), /\bgv-page\b/, `${f} does not use gv-page`);
    }
  });
});
