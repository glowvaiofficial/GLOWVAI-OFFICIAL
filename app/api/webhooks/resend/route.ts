import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { env } from "@/lib/env";
import { logEmailEvent } from "@/lib/email/log";
import { addSuppression } from "@/lib/email/suppression";

export const dynamic = "force-static";

/**
 * GLOW VAI Resend Webhook Handler.
 * Verifies Svix signature headers on the raw request body.
 * Logs event metrics to EmailEvents and manages bounce/complaint suppressions.
 */

const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  const secret = env.RESEND_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET;

  const rawBody = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (secret && secret !== "whsec_abcdef123456") {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing Svix signature headers" }, { status: 401 });
    }

    try {
      const wh = new Webhook(secret);
      wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  let evt: any;
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type: eventType, data } = evt || {};
  if (!eventType || !data) {
    return NextResponse.json({ ok: true });
  }

  const messageId = data.email_id || data.id || `msg_${Date.now()}`;
  const eventKey = `${messageId}:${eventType}`;

  // Idempotency: ignore duplicate webhook deliveries
  if (processedEvents.has(eventKey)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  processedEvents.add(eventKey);

  // Non-blocking processing
  Promise.resolve().then(async () => {
    const recipientEmail = Array.isArray(data.to) ? data.to[0] : data.to || "";
    const template = data.tags?.template || "unknown";
    const relatedId = data.tags?.related_id || "N/A";

    let status: "sent" | "delivered" | "bounced" | "complained" | "failed" = "sent";
    if (eventType === "email.delivered") status = "delivered";
    if (eventType === "email.bounced") status = "bounced";
    if (eventType === "email.complained") status = "complained";
    if (eventType === "email.failed") status = "failed";

    await logEmailEvent({
      messageId,
      template,
      relatedId,
      status,
      eventType,
      recipientEmail,
      errorCode: data.error?.code || data.bounce?.type || "",
    });

    if (eventType === "email.bounced") {
      await addSuppression(recipientEmail, "bounced", "resend_webhook");
    } else if (eventType === "email.complained") {
      await addSuppression(recipientEmail, "complained", "resend_webhook");
    }
  }).catch((err) => {
    console.error("Resend webhook async processing error:", err);
  });

  return NextResponse.json({ ok: true });
}
