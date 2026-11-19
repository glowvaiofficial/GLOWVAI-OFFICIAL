import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// next.config.js is CommonJS; load it the same way Next does.
const require = createRequire(import.meta.url);
const nextConfig = require("../../next.config.js") as { headers: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>> };

async function policyFor(match: (source: string) => boolean): Promise<string> {
  const rules = await nextConfig.headers();
  const rule = rules.find((r) => match(r.source) && r.headers.some((h) => h.key === "Content-Security-Policy"));
  assert.ok(rule, "a CSP rule exists for this path");
  return rule.headers.find((h) => h.key === "Content-Security-Policy")!.value;
}

const connectSources = (policy: string): string[] => {
  const directive = policy.split(";").map((d) => d.trim()).find((d) => d.startsWith("connect-src "));
  assert.ok(directive, "connect-src is present");
  return directive.split(/\s+/).slice(1);
};

// The site-wide policy (every page except /shop and the portals). Home is served under it, and client-side links to /shop keep it.
const SITE_WIDE = (source: string) => source.includes("portal") && source.includes("shop");
const REQUIRED_SITE_CONNECT = [
  "https://firestore.googleapis.com",
  "wss://firestore.googleapis.com",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
];

describe("CSP connect-src for the Firebase hosts the shop calls", () => {
  test("the site-wide policy lists each Firebase host the shop reads or signs in with", async () => {
    const sources = connectSources(await policyFor(SITE_WIDE));
    for (const host of REQUIRED_SITE_CONNECT) {
      assert.ok(sources.includes(host), `connect-src must include ${host}`);
    }
  });

  test("the site-wide connect-src has no wildcard that matches every host", async () => {
    const sources = connectSources(await policyFor(SITE_WIDE));
    for (const bad of ["*", "https:", "wss:", "http:", "ws:"]) {
      assert.ok(!sources.includes(bad), `connect-src must not contain the bare source ${bad}`);
    }
  });

  test("the Firebase hosts added to the site-wide policy are exact hosts, not wildcards", async () => {
    const sources = connectSources(await policyFor(SITE_WIDE));
    for (const host of REQUIRED_SITE_CONNECT) {
      assert.ok(!host.includes("*"), `${host} is written as an exact host`);
      assert.ok(sources.includes(host));
    }
  });

  test("the /shop policy keeps the Firebase hosts it already needs", async () => {
    const sources = connectSources(await policyFor((source) => source === "/shop"));
    for (const host of ["https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://*.googleapis.com"]) {
      assert.ok(sources.includes(host), `shop connect-src keeps ${host}`);
    }
  });
});

const directiveSources = (policy: string, name: string): string[] => {
  const directive = policy.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
  assert.ok(directive, `${name} is present`);
  return directive.split(/\s+/).slice(1);
};

describe("CSP for the delivery map (OpenStreetMap tiles and Nominatim)", () => {
  for (const [label, match] of [["/shop", (s: string) => s === "/shop"], ["site-wide", SITE_WIDE]] as const) {
    test(`${label}: tiles load from the exact OSM tile host and search from Nominatim`, async () => {
      const policy = await policyFor(match);
      assert.ok(directiveSources(policy, "img-src").includes("https://tile.openstreetmap.org"));
      assert.ok(directiveSources(policy, "connect-src").includes("https://nominatim.openstreetmap.org"));
    });
    test(`${label}: no wildcard OSM host and no blanket image source`, async () => {
      const img = directiveSources(await policyFor(match), "img-src");
      for (const bad of ["*", "https:", "http:", "https://*.openstreetmap.org"]) assert.ok(!img.includes(bad), `img-src must not contain ${bad}`);
    });
  }

  test("/shop: nothing else (default-src, style-src) blocks tile images", async () => {
    const policy = await policyFor((s) => s === "/shop");
    // img-src is set explicitly, so default-src does not apply to images; tiles are plain <img>, not CSS backgrounds or workers.
    assert.ok(policy.includes("img-src "));
    assert.ok(!/img-src[^;]*'none'/.test(policy));
  });
});
