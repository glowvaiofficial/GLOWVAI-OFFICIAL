import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createConfirmToken, verifyConfirmToken } from "@/lib/email/tokens";
import { queueEmail, sendEmail } from "@/lib/email/send";
import { storage } from "@/lib/storage";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-static";

const newsletterSchema = z.object({
  email: z.string().trim().email("Valid email address required"),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});

const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > 10;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=invalid`);
  }

  const verified = verifyConfirmToken(token);
  if (!verified.valid || !verified.email) {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=expired`);
  }

  const cleanEmail = verified.email;

  try {
    // Update status to confirmed in Sheets
    await storage.callSheet({
      tab: "Newsletter",
      action: "confirm",
      data: { email: cleanEmail, status: "confirmed", confirmed_at: new Date().toISOString() },
    });

    // Send welcome email
    await sendEmail({
      template: "newsletter_welcome",
      to: cleanEmail,
      data: {},
      relatedId: `NL-CONF-${Date.now()}`,
      stream: "marketing",
    });

    return NextResponse.redirect(`${SITE_URL}/?newsletter=confirmed`);
  } catch {
    return NextResponse.redirect(`${SITE_URL}/?newsletter=confirmed`);
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or consent" }, { status: 400 });
  }

  const d = parsed.data;
  if (d.website) {
    return NextResponse.json({ success: true });
  }

  const now = new Date().toISOString();
  const cleanEmail = d.email.trim().toLowerCase();
  const confirmToken = createConfirmToken(cleanEmail);

  try {
    await storage.callSheet({
      tab: "Newsletter",
      data: {
        created_at: now,
        email: cleanEmail,
        source: "footer_banner",
        consent: "yes",
        consent_at: now,
        status: "pending_confirmation",
      },
    });

    // Send double opt-in confirmation email
    queueEmail({
      template: "newsletter_confirm",
      to: cleanEmail,
      data: { token: confirmToken },
      relatedId: `NL-REQ-${Date.now()}`,
      stream: "marketing",
    });

    return NextResponse.json({
      success: true,
      message: "Check your inbox to confirm your subscription.",
    });
  } catch {
    return NextResponse.json({ success: true });
  }
}
