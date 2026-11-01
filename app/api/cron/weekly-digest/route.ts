import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { storage } from "@/lib/storage";
import crypto from "node:crypto";

export const dynamic = "force-static";

/**
 * GLOW VAI Weekly Performance Digest Cron Route.
 * Runs on Mondays 9:00 IST. Summarizes 7-day business metrics without personal data.
 */

export async function GET(req: NextRequest) {
  const cronSecret = env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }

  const provided = req.headers.get("authorization")?.replace("Bearer ", "") || "";
  const ok =
    provided.length === cronSecret.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(cronSecret));
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
  }

  try {
    // Fetch summary metrics from Google Sheets storage
    const sheetMetrics = await storage.callSheet({
      tab: "Digest",
      action: "weekly_summary",
    });

    const digestData = {
      scansStarted: sheetMetrics.scansStarted || 0,
      scansCompleted: sheetMetrics.scansCompleted || 0,
      leads: sheetMetrics.leads || 0,
      intents: sheetMetrics.intents || 0,
      confirmedOrders: sheetMetrics.confirmedOrders || 0,
      pendingEnquiries: sheetMetrics.pendingEnquiries || 0,
      bouncedEmails: sheetMetrics.bouncedEmails || 0,
    };

    const teamRecipients = env.TEAM_NOTIFY_EMAIL.split(",").map((s) => s.trim()).filter(Boolean);
    const relatedId = `DIGEST-${new Date().toISOString().slice(0, 10)}`;

    for (const recipient of teamRecipients) {
      await sendEmail({
        template: "weekly_digest",
        to: recipient,
        data: digestData,
        relatedId,
        stream: "transactional",
      });
    }

    return NextResponse.json({ ok: true, sentTo: teamRecipients, digestData });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cron processing error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
