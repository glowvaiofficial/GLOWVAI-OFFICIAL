import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { verifySessionToken } from "@/lib/session";
import { storage } from "@/lib/storage";

export const maxDuration = 30; // 30s timeout for image uploads

export async function POST(req: NextRequest) {
  const limited = rateLimit(`lead-image:${clientIp(req)}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
  }
  const sessionCookie = req.cookies.get("gv_session")?.value;
  const verification = verifySessionToken(sessionCookie || "");

  const body = await req.json().catch(() => null);
  if (!body || !body.image_base64) {
    return NextResponse.json({ error: "Missing image data" }, { status: 400 });
  }
  if (typeof body.image_base64 !== "string" || body.image_base64.length > 4_000_000) {
    return NextResponse.json({ error: "Image is too large" }, { status: 413 });
  }
  const allowedMime = ["image/jpeg", "image/png", "image/webp"];
  const mime = allowedMime.includes(body.mime) ? body.mime : "image/jpeg";

  // Use verified session ID, or session_id from request body, or fallback
  const sessionId = verification.valid && verification.sessionId
    ? verification.sessionId
    : body.session_id || "scan-session";

  try {
    const r = await storage.callSheet({
      action: "upload_image",
      session_id: sessionId,
      mime,
      image_base64: body.image_base64,
    });

    return NextResponse.json({ ok: true, result: r });
  } catch (err) {
    console.error("Error uploading scan image (PII omitted):", String(err).slice(0, 100));
    return NextResponse.json({ ok: true, fallback: true });
  }
}
