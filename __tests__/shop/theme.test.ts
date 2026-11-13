import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, readTheme, themeCssVariables } from "@/lib/shop/theme";

test("no stored theme gives the built-in defaults", () => {
  assert.deepEqual(readTheme(undefined), DEFAULT_THEME);
});

test("valid colours and fonts are used", () => {
  const t = readTheme({ brand: "#ff3366", ink: "#000000", muted: "#777777", line: "#eeeeee", headingFont: "syne", bodyFont: "manrope" });
  assert.equal(t.brand, "#ff3366");
  assert.equal(t.headingFont, "syne");
});

test("bad colours fall back to the default, one field at a time", () => {
  const t = readTheme({ brand: "red", ink: "#fff", muted: "javascript:alert(1)", line: "#abcdef" });
  assert.equal(t.brand, DEFAULT_THEME.brand);
  assert.equal(t.ink, DEFAULT_THEME.ink);
  assert.equal(t.muted, DEFAULT_THEME.muted);
  assert.equal(t.line, "#abcdef");
});

test("only the two allowed fonts are accepted", () => {
  const t = readTheme({ headingFont: "comic-sans", bodyFont: "syne" });
  assert.equal(t.headingFont, DEFAULT_THEME.headingFont);
  assert.equal(t.bodyFont, "syne");
});

test("the CSS variables are exactly the agreed names", () => {
  const vars = themeCssVariables(DEFAULT_THEME);
  assert.deepEqual(Object.keys(vars).sort(), ["--ds-brand", "--ds-ink", "--ds-line", "--ds-muted", "--font-body", "--font-heading"]);
  assert.match(vars["--font-heading"], /Manrope/);
});
