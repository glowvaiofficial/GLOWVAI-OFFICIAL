import { NextRequest, NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/schemas";
import { storage } from "@/lib/storage";
import { queueEmail } from "@/lib/email/send";
import { env } from "@/lib/env";

const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > 5;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid form input" }, { status: 400 });
  }

  const d = parsed.data;
  if (d.website) {
    return NextResponse.json({ success: true }); // Honeypot
  }

  const now = new Date().toISOString();
  const dateRef = now.slice(2, 10).replace(/-/g, "");
  const randRef = Math.floor(1000 + Math.random() * 9000);
  const ref = `CT-${dateRef}-${randRef}`;

  try {
    await storage.callSheet({
      tab: "Contact",
      data: {
        created_at: now,
        ref,
        name: d.name,
        email: d.email,
        phone: d.phone || "",
        topic: d.topic,
        message: d.message,
        status: "new",
      },
    });

    // 1. Send acknowledgement email to enquirer (No message body copy)
    if (d.email && d.email.includes("@")) {
      queueEmail({
        template: "contact_ack",
        to: d.email,
        data: { ref, topic: d.topic },
        relatedId: ref,
        stream: "transactional",
      });
    }

    // 2. Send internal notification email to team
    const teamRecipients = env.TEAM_NOTIFY_EMAIL.split(",").map((s) => s.trim()).filter(Boolean);
    for (const teamEmail of teamRecipients) {
      queueEmail({
        template: "contact_notify",
        to: teamEmail,
        data: {
          ref,
          topic: d.topic,
          name: d.name,
          email: d.email,
          phone: d.phone || "",
          message: d.message,
        },
        relatedId: ref,
        stream: "transactional",
        replyTo: d.email || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      ref,
      message: "Thank you for reaching out. Our team will get back to you shortly.",
    });
  } catch {
    return NextResponse.json({ success: true, ref });
  }
}
