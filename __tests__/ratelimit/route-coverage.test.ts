// Routes that used to have no rate limit now check one before any other work.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

// The body of one exported handler, up to the next exported handler.
function handler(source: string, method: string): string {
  const start = source.indexOf(`export async function ${method}(`);
  assert.ok(start >= 0, `${method} handler exists`);
  const next = source.indexOf("export async function ", start + 10);
  return source.slice(start, next === -1 ? undefined : next);
}

describe("site routes check a per-IP limit first", () => {
  const cases: [string, string, RegExp][] = [
    ["app/api/admin/email/route.ts", "GET", /rateLimit\(`admin-email-status:\$\{clientIp\(req\)\}`/],
    ["app/api/admin/session/route.ts", "GET", /rateLimit\(`admin-session:\$\{clientIp\(req\)\}`/],
    ["app/api/admin/session/route.ts", "DELETE", /rateLimit\(`admin-logout:\$\{clientIp\(req\)\}`/],
    ["app/api/newsletter/route.ts", "GET", /rateLimit\(`newsletter-confirm:\$\{clientIp\(req\)\}`/],
    ["app/api/unsubscribe/route.ts", "GET", /rateLimit\(`unsubscribe-get:\$\{clientIp\(req\)\}`/],
    ["app/api/lead/route.ts", "PATCH", /limited\(`patch:\$\{ip\}`\)/],
  ];
  for (const [file, method, pattern] of cases) {
    it(`${method} ${file}`, () => {
      const body = handler(read(file), method);
      assert.match(body, pattern);
      // The limit comes before the session cookie or token is read.
      const limitAt = body.search(pattern);
      for (const later of ["cookies()", "isSignedIn()", "searchParams.get(\"token\")", "req.cookies.get"]) {
        const at = body.indexOf(later);
        if (at >= 0) assert.ok(limitAt < at, `${file} ${method}: limit runs before ${later}`);
      }
    });
  }
});

describe("rider routes have an IP limit, checked before the session lookup", () => {
  const routes: [string, string][] = [
    ["app/api/rider/me/route.ts", "me"],
    ["app/api/rider/logout/route.ts", "logout"],
    ["app/api/rider/deliveries/route.ts", "deliveries"],
    ["app/api/rider/deliveries/[orderId]/cash/route.ts", "cash"],
    ["app/api/rider/deliveries/[orderId]/start/route.ts", "start"],
    ["app/api/rider/deliveries/[orderId]/exception/route.ts", "exception"],
    ["app/api/rider/location/route.ts", "location"],
    ["app/api/rider/location/stop/route.ts", "location-stop"],
  ];
  for (const [file, name] of routes) {
    it(name, () => {
      assert.match(read(file), new RegExp(`\\{ route: "${name}", [^}]*ip: \\{ max: \\d+, windowMs: [\\d_]+ \\}`));
    });
  }

  it("the rider wrapper checks the IP limit before reading the session", () => {
    const http = read("lib/rider/http.ts");
    assert.ok(http.indexOf("opts.ip &&") < http.indexOf("await riderFrom(req)"));
  });
});
