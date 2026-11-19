import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { env } from "@/lib/env";
import { logEmailEvent } from "@/lib/email/log";
import { addSuppression } from "@/lib/email/suppression";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GLOW VAI Resend Webhook Handler.
 * Verifies Svix signature headers on the raw request body.
 * Logs event metrics to EmailEvents and manages bounce/complaint suppressions.
 */

const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  // A per-IP limit first, so unsigned floods are turned away before the body is read or any signature work is done.
  // Generous (300 a minute): Resend sends bursts and retries refused deliveries later.
  const limit = rateLimit(`resend-webhook:${clientIp(req)}`, 300, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret || secret === "whsec_abcdef123456") {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (secret) {
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
  // The set lives in this server instance only and must not grow without end.
  if (processedEvents.size > 5000) processedEvents.clear();
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
