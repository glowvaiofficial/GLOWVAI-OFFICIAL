import { NextRequest, NextResponse } from "next/server";
import { legacyShopProductPath } from "./lib/shop/productShare";

// Guards the admin console. A request to /admin2006/console is only forwarded when the browser holds a valid admin
// session cookie, signed with SESSION_SECRET. Edge-safe: it uses Web Crypto, not node:crypto.
const COOKIE = "gv_admin";

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isValidSession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = await hmacHex(secret, `admin:${payload}`);
  if (sig.length !== expected.length) return false;
  // Constant-time comparison of two equal-length hex strings.
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 && Date.now() < Number(payload);
}

export async function middleware(req: NextRequest) {
  // Old shop links (/shop?product=<id>) move to the product page, which has the product's own link preview.
  if (req.nextUrl.pathname === "/shop") {
    const target = legacyShopProductPath(req.nextUrl.searchParams);
    if (target) return NextResponse.redirect(new URL(target, req.url), 307);
    return NextResponse.next();
  }
  const secret = process.env.SESSION_SECRET;
  const ok = Boolean(secret) && (await isValidSession(req.cookies.get(COOKIE)?.value, secret as string));
  if (!ok) return NextResponse.redirect(new URL("/admin2006", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/shop", "/admin2006/console/:path*"],
};
