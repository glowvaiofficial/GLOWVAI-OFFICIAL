import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { ADMIN_COOKIE, ADMIN_SESSION_MS, signSession, verifyPasscode, verifySession } from "@/lib/security/adminAuth";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;

function secureCookie() {
  return process.env.NODE_ENV === "production";
}

/** Is the current request carrying a valid admin session? */
export async function GET() {
  const secret = process.env.SESSION_SECRET;
  const jar = await cookies();
  const authed = Boolean(secret) && verifySession(jar.get(ADMIN_COOKIE)?.value, secret as string);
  return NextResponse.json({ authenticated: authed }, { headers: { "Cache-Control": "no-store" } });
}

/** Log in with the admin passcode. Five attempts per IP every 15 minutes. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } }
    );
  }

  const secret = process.env.SESSION_SECRET;
  const storedHash = process.env.ADMIN_PASSCODE_HASH;
  if (!secret || !storedHash) {
    return NextResponse.json({ ok: false, error: "Admin is not configured." }, { status: 503 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
  }

  let passcode = "";
  try {
    passcode = String(JSON.parse(raw)?.passcode ?? "").slice(0, 200);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!passcode || !verifyPasscode(passcode, storedHash)) {
    return NextResponse.json({ ok: false, error: "Wrong passcode." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const expiresAt = Date.now() + ADMIN_SESSION_MS;
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE, signSession(expiresAt, secret), {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(ADMIN_SESSION_MS / 1000),
  });
  return res;
}

/** Log out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: secureCookie(), sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
