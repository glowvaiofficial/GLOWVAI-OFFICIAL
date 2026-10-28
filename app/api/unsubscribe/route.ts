import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email/tokens";
import { addSuppression } from "@/lib/email/suppression";
import { storage } from "@/lib/storage";

export const dynamic = "force-static";

/**
 * GLOW VAI Unsubscribe Handler (RFC 8058 One-Click Compliant).
 * Serves GET and POST requests without requiring user login.
 */

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const emailParam = req.nextUrl.searchParams.get("email") || "";

  if (token) {
    const verified = verifyUnsubscribeToken(token);
    if (verified.valid && verified.email) {
      return NextResponse.json({
        ok: true,
        email: verified.email,
        message: "Token valid. Send POST request to confirm unsubscribe.",
      });
    }
  }

  if (emailParam && emailParam.includes("@")) {
    return NextResponse.json({
      ok: true,
      email: emailParam,
      message: "Send POST request to confirm unsubscribe.",
    });
  }

  return NextResponse.json({ error: "Invalid or missing unsubscribe token" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let token = req.nextUrl.searchParams.get("token") || "";
  let emailToUnsub = "";

  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.token) token = body.token;
      if (body.email) emailToUnsub = body.email;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      if (formData.get("token")) token = String(formData.get("token"));
      if (formData.get("email")) emailToUnsub = String(formData.get("email"));
    }
  } catch {
    // Continue with token from query
  }

  if (token) {
    const verified = verifyUnsubscribeToken(token);
    if (verified.valid && verified.email) {
      emailToUnsub = verified.email;
    }
  }

  if (!emailToUnsub || !emailToUnsub.includes("@")) {
    return NextResponse.json({ error: "Invalid unsubscribe token or email address" }, { status: 400 });
  }

  const cleanEmail = emailToUnsub.trim().toLowerCase();

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

  return NextResponse.json({
    ok: true,
    message: "You have been successfully unsubscribed from GLOW VAI marketing communications.",
  });
}
