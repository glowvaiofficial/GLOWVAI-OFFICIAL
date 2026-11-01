import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queueEmail } from "@/lib/email/send";
import { storage } from "@/lib/storage";

const waitlistSchema = z.object({
  email: z.string().trim().email("Valid email required"),
  pincode: z.string().trim().length(6, "Valid 6-digit pincode required"),
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

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid waitlist submission" }, { status: 400 });
  }

  const d = parsed.data;
  if (d.website) {
    return NextResponse.json({ success: true });
  }

  const now = new Date().toISOString();
  const city = decodeURIComponent(req.headers.get("x-vercel-ip-city") || "");
  const cleanEmail = d.email.trim().toLowerCase();
  const ref = `WL-${Date.now()}`;

  try {
    await storage.callSheet({
      tab: "Waitlist",
      data: {
        created_at: now,
        email: cleanEmail,
        pincode: d.pincode,
        city,
        consent: "yes",
        source: "pincode_checker",
      },
    });

    // Queue waitlist confirmation email
    queueEmail({
      template: "waitlist_confirm",
      to: cleanEmail,
      data: {},
      relatedId: ref,
      stream: "transactional",
    });

    return NextResponse.json({
      success: true,
      message: "Added to pincode waitlist! We will notify you when micro hubs launch in your area.",
    });
  } catch {
    return NextResponse.json({ success: true });
  }
}
