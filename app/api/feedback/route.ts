import { NextRequest, NextResponse } from "next/server";
import { RETIRED_FORM_ROUTES, retiredRoute } from "@/lib/http/retired";
import { z } from "zod";

const feedbackSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  city: z.string().trim().max(80).optional(),
  skinType: z.string().trim().max(50).optional(),
  productTried: z.string().trim().max(50).optional(),
  rating: z.number().min(1).max(5),
  message: z.string().trim().min(5).max(1000),
  consentToPublish: z.boolean(),
  website: z.string().max(0).optional(), // Honeypot
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

async function callSheet(payload: object) {
  const webappUrl = process.env.SHEETS_WEBAPP_URL || process.env.SHEET_WEB_APP_URL;
  if (!webappUrl) {
    return { ok: true };
  }

  const res = await fetch(webappUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret: process.env.SHEETS_SECRET, ...payload }),
    redirect: "follow",
    cache: "no-store",
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  if (RETIRED_FORM_ROUTES) return retiredRoute();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback data" }, { status: 400 });
  }

  const d = parsed.data;
  if (d.website) {
    return NextResponse.json({ success: true }); // Honeypot
  }

  const now = new Date().toISOString();

  try {
    await callSheet({
      tab: "Feedback",
      data: {
        created_at: now,
        first_name: d.firstName,
        city: d.city || "",
        skin_type: d.skinType || "Combination",
        product: d.productTried || "Face Scan",
        rating: d.rating,
        message: d.message,
        consent_to_publish: d.consentToPublish ? "yes" : "no",
        status: "new",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thank you. We read every one.",
    });
  } catch (err) {
    return NextResponse.json({ success: true }); // Fallback response so UX flows smoothly
  }
}
