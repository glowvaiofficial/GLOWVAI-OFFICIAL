import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { sendServerGA4Purchase, sendServerGA4Refund } from "@/lib/analytics/mp";
import { queueEmail } from "@/lib/email/send";
import { createUnsubscribeToken } from "@/lib/email/tokens";

export const dynamic = "force-static";

/**
 * GLOW VAI Internal Order Status Webhook.
 * Receives order status updates from Google Apps Script onOrderStatusEdit trigger.
 * Performs HMAC-SHA256 signature verification and 5-minute timestamp window check.
 */

const processedPurchases = new Set<string>();

export async function POST(req: NextRequest) {
  const secret = env.INTERNAL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");
  const timestampStr = req.headers.get("x-timestamp");

  if (!signature || !timestampStr) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
  }

  const ts = parseInt(timestampStr, 10);
  const now = Date.now();
  if (isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Timestamp expired or out of window" }, { status: 401 });
  }

  // Verify HMAC-SHA256
  const payloadToSign = `${timestampStr}.${rawBody}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(payloadToSign).digest("hex");

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid signature match" }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { order_ref, status, final_value, ga_client_id, ga_session_id, analytics_consent, email, items } = body;

  if (!order_ref || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const numericValue = typeof final_value === "number" ? final_value : parseFloat(final_value || "0");

  const formattedItems = Array.isArray(items)
    ? items
    : [
        {
          item_id: "GV-ROUTINE-SET",
          item_name: "Custom Routine Order",
          item_brand: "GLOW VAI",
          price: numericValue,
          quantity: 1,
        },
      ];

  if (status === "confirmed") {
    const purchaseKey = `purchase_${order_ref}`;
    if (!processedPurchases.has(purchaseKey)) {
      processedPurchases.add(purchaseKey);
      await sendServerGA4Purchase({
        clientId: ga_client_id || "",
        sessionId: ga_session_id || "",
        transactionId: order_ref,
        value: numericValue,
        currency: "INR",
        items: formattedItems,
        analyticsConsent: analytics_consent || "no",
      });
    }
  } else if (status === "cancelled") {
    await sendServerGA4Refund({
      clientId: ga_client_id || "",
      transactionId: order_ref,
      value: numericValue,
      currency: "INR",
      items: formattedItems,
      analyticsConsent: analytics_consent || "no",
    });
  } else if (status === "delivered") {
    if (env.REVIEW_EMAILS === "true" && email && typeof email === "string" && email.includes("@")) {
      const reviewToken = createUnsubscribeToken(email, "review");
      queueEmail({
        template: "review_request",
        to: email,
        data: { token: reviewToken },
        relatedId: order_ref,
        stream: "transactional",
      });
    }
  }

  return NextResponse.json({ ok: true, order_ref, status });
}
