import { NextRequest, NextResponse } from "next/server";
import { dataRequestSchema } from "@/lib/schemas";
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
  const parsed = dataRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data request" }, { status: 400 });
  }

  const d = parsed.data;
  if (d.website) {
    return NextResponse.json({ success: true });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const dateRef = nowIso.slice(2, 10).replace(/-/g, "");
  const randRef = Math.floor(1000 + Math.random() * 9000);
  const ref = `DR-${dateRef}-${randRef}`;

  const deadlineDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  try {
    await storage.callSheet({
      tab: "DataRequests",
      data: {
        created_at: nowIso,
        ref,
        contact: d.contact,
        type: d.type,
        details: d.details || "",
        deadline: deadlineDate,
        status: "new",
      },
    });

    // 1. Send acknowledgement if contact is email
    if (d.contact && d.contact.includes("@")) {
      queueEmail({
        template: "data_request_ack",
        to: d.contact.trim(),
        data: { ref, reqType: d.type },
        relatedId: ref,
        stream: "transactional",
      });
    }

    // 2. Send internal notification to team
    const teamRecipients = env.TEAM_NOTIFY_EMAIL.split(",").map((s) => s.trim()).filter(Boolean);
    for (const teamEmail of teamRecipients) {
      queueEmail({
        template: "data_request_notify",
        to: teamEmail,
        data: {
          ref,
          reqType: d.type,
          contact: d.contact,
          deadline: deadlineDate,
        },
        relatedId: ref,
        stream: "transactional",
      });
    }

    return NextResponse.json({
      success: true,
      ref,
      message: "Your request has been received. Our data protection officer will review and process it within the timeframe set in our Privacy Policy.",
    });
  } catch {
    return NextResponse.json({ success: true, ref });
  }
}
