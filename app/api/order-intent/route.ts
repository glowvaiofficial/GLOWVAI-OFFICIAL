import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProduct } from "@/lib/catalog";
import { queueEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";

const schema = z.object({
  order_ref: z.string().regex(/^GV-\d{6}-[A-Z2-7]{4}$/),
  items: z
    .array(
      z.object({
        sku: z.string().max(60),
        qty: z.number().int().min(1).max(10),
      })
    )
    .min(1)
    .max(20),
  pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal("")),
  source_page: z.string().max(80).optional(),
  website: z.string().max(0).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  ga_client_id: z.string().max(100).optional(),
  ga_session_id: z.string().max(100).optional(),
  analytics_consent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true });

  let subtotal = 0;
  const lines = [];
  for (const it of d.items) {
    const p = await getProduct(it.sku);
    if (!p) continue;
    subtotal += p.price * it.qty;
    lines.push({ sku: p.id, name: p.name, qty: it.qty, price: p.price });
  }

  if (!lines.length && d.items.length > 0) {
    subtotal = 0;
    for (const it of d.items) {
      lines.push({ sku: it.sku, name: "Skincare Product", qty: it.qty, price: 499 });
      subtotal += 499 * it.qty;
    }
  }

  const hasConsent = d.analytics_consent === "yes";
  const clientId = hasConsent ? d.ga_client_id || "" : "";
  const sessionId = hasConsent ? d.ga_session_id || "" : "";

  try {
    await storage.callSheet({
      action: "create",
      tab: "OrderIntents",
      data: {
        created_at: new Date().toISOString(),
        order_ref: d.order_ref,
        items_json: JSON.stringify(lines),
        subtotal,
        pincode: d.pincode || "500081",
        source_page: d.source_page || "cart",
        utm_source: d.utm_source || "direct",
        utm_medium: d.utm_medium || "",
        utm_campaign: d.utm_campaign || "",
        ga_client_id: clientId,
        ga_session_id: sessionId,
        analytics_consent: hasConsent ? "yes" : "no",
        status: "new",
      },
    });

    // Queue internal team notification email
    const teamRecipients = env.TEAM_NOTIFY_EMAIL.split(",").map((s) => s.trim()).filter(Boolean);
    const itemSummary = lines.map((l) => `${l.name} (x${l.qty})`).join(", ");

    for (const teamEmail of teamRecipients) {
      queueEmail({
        template: "order_intent_notify",
        to: teamEmail,
        data: {
          ref: d.order_ref,
          items: itemSummary,
          subtotal,
          pincode: d.pincode || "Not provided",
          sourcePage: d.source_page || "cart",
          utmSource: d.utm_source || "direct",
          time: new Date().toISOString(),
        },
        relatedId: d.order_ref,
        stream: "transactional",
      });
    }
  } catch {
    /* never block the WhatsApp redirect */
  }

  return NextResponse.json({ ok: true });
}
