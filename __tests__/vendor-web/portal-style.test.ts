import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Design rules for the vendor portal (DESIGN-SPEC 2b, 9): no orange/amber/yellow UI colours, no web fonts, no emoji.
const ROOTS = ["components/vendor-web", "app/vendor"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx|ts|css)$/.test(n) ? [p] : [];
  });
}

function isWarmHex(hex: string): boolean {
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  // Warm = red clearly above blue with green well above blue (yellow, amber, orange, gold, brown family), not pinks/reds.
  return r - b > 40 && g - b > 40;
}

test("vendor portal UI has no warm (amber/orange/yellow) colours", () => {
  const bad: string[] = [];
  for (const f of ROOTS.flatMap(files)) {
    for (const m of readFileSync(f, "utf8").matchAll(/#([0-9a-fA-F]{6})\b/g)) if (isWarmHex(m[1])) bad.push(`${f} #${m[1]}`);
    if (/\b(amber|orange|yellow)-\d{2,3}\b/.test(readFileSync(f, "utf8"))) bad.push(`${f} tailwind warm class`);
  }
  assert.deepEqual(bad, []);
});

test("vendor portal loads no web fonts and has no emoji", () => {
  const bad: string[] = [];
  for (const f of ROOTS.flatMap(files)) {
    const s = readFileSync(f, "utf8");
    if (/next\/font|fonts\.googleapis|Syne|Poppins/.test(s)) bad.push(`${f} web font`);
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s)) bad.push(`${f} emoji`);
  }
  assert.deepEqual(bad, []);
});
