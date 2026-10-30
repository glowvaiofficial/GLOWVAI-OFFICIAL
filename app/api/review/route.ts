import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { z } from "zod";

const reviewSubmitSchema = z.object({
  token: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(20, "Review must be at least 20 characters").max(1000),
  display_name: z.string().trim().min(2).max(50),
  city: z.string().trim().max(50).optional(),
  consent_to_publish: z.boolean().refine((val) => val === true, {
    message: "Consent to publish is required.",
  }),
  website: z.string().max(0, "Bot submission detected"), // Honeypot
});

async function callSheet(payload: object) {
  const webappUrl = process.env.SHEETS_WEBAPP_URL || process.env.SHEET_WEB_APP_URL;
  if (!webappUrl) return { ok: false };

  const res = await fetch(webappUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret: process.env.SHEETS_SECRET, ...payload }),
    redirect: "follow",
    cache: "no-store",
  });
  return res.json();
}

export async function POST(request: Request) {
  const limited = rateLimit(`review:${clientIp(request)}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
  }
  try {
    const body = await request.json().catch(() => null);
    const validated = reviewSubmitSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: "Validation failed", issues: validated.error.issues }, { status: 400 });
    }

    const r = validated.data;

    // Reviews are stored in the Feedback tab with a product_review kind, marked new for moderation.
    // Nothing is shown publicly until someone approves it.
    const result = await callSheet({
      tab: "Feedback",
      data: {
        created_at: new Date().toISOString(),
        first_name: r.display_name,
        city: r.city || "",
        skin_type: "",
        product: "",
        rating: r.rating,
        message: [r.title, r.body].filter(Boolean).join(" — "),
        consent_to_publish: r.consent_to_publish ? "yes" : "no",
        kind: "product_review",
        review_ref: r.token,
        status: "new",
      },
    });

    if (!result || result.ok === false) {
      return NextResponse.json({ error: "Could not save your review" }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: "Thank you. Your review has been received and will appear once it is checked.",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
