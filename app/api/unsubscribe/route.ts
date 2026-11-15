import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { emailFromUnsubscribeToken } from "@/lib/email/tokens";
import { addSuppression } from "@/lib/email/suppression";
import { storage } from "@/lib/storage";

// Reads the query string, headers and body of each request, so it must never be rendered once at build time.
export const dynamic = "force-dynamic";

/**
 * GLOW VAI Unsubscribe Handler (RFC 8058 One-Click Compliant).
 * Serves GET and POST requests without requiring user login. Every unsubscribe needs the signed token from the link
 * in a sent email (lib/email/tokens.ts): a bare email address is never accepted, so nobody can unsubscribe someone else.
 */

const NO_STORE = { "Cache-Control": "no-store" };
const TOKEN_MAX = 1024;

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { ...NO_STORE, "Retry-After": String(retryAfter) } },
  );
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(`unsubscribe-get:${clientIp(req)}`, 30, 60_000);
  if (!limited.ok) return tooMany(limited.retryAfter);

  const token = req.nextUrl.searchParams.get("token") || "";

  // The List-Unsubscribe header points here. A mail app or person opening it in a browser gets the confirm page.
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    const page = new URL("/unsubscribe", req.nextUrl.origin);
    if (token && token.length <= TOKEN_MAX) page.searchParams.set("token", token);
    return NextResponse.redirect(page, { status: 303, headers: NO_STORE });
  }

  const email = emailFromUnsubscribeToken(token);
  if (!email) {
    return NextResponse.json({ error: "Invalid or missing unsubscribe token" }, { status: 400, headers: NO_STORE });
  }
  return NextResponse.json(
    { ok: true, email, message: "Token valid. Send POST request to confirm unsubscribe." },
    { headers: NO_STORE },
  );
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(`unsubscribe:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) return tooMany(limited.retryAfter);

  // The token comes from the query string (one-click POST from a mail app) or the body (the unsubscribe page).
  // An email address in the body is ignored: only the address inside a valid signed token is unsubscribed.
  let token = req.nextUrl.searchParams.get("token") || "";
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body && typeof body.token === "string" && body.token) token = body.token;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const fromForm = formData.get("token");
      if (typeof fromForm === "string" && fromForm) token = fromForm;
    }
  } catch {
    // Continue with the token from the query string.
  }

  const cleanEmail = emailFromUnsubscribeToken(token);
  if (!cleanEmail) {
    return NextResponse.json(
      { error: "This unsubscribe link is not valid. Use the unsubscribe link at the bottom of any GLOW VAI email." },
      { status: 400, headers: NO_STORE },
    );
  }

  // Add to Suppressions tab
  await addSuppression(cleanEmail, "unsubscribed", "unsubscribe_link");

  // Update Newsletter tab status in Sheets
  try {
    await storage.callSheet({
      tab: "Newsletter",
      action: "unsubscribe",
      data: { email: cleanEmail, status: "unsubscribed" },
    });
  } catch (err) {
    console.error("Non-blocking newsletter status update error:", err);
  }

  return NextResponse.json(
    { ok: true, message: "You have been successfully unsubscribed from GLOW VAI marketing communications." },
    { headers: NO_STORE },
  );
}
