import { NextRequest } from "next/server";
import { COUPON_VALUES } from "@/glowvai-app/shared/pricing-rules.mjs";
import { customerFrom, db, json, limitByIp } from "@/lib/shop/server";
import { evaluateOffer, normalizeCode, type OfferLine } from "@/lib/shop/offers";
import { findOfferByCode, offerUsage } from "@/lib/shop/offerLookup";
import { orderItemFor, parseCartLines, type ProductDoc } from "@/lib/shop/variants";

export const dynamic = "force-dynamic";

// What a promo code would take off this bag, worked out from the catalogue prices (never from the phone). Used by the
// cart so the discount shown matches the order. Public, rate limited. Lines are product id, variant id and quantity.
export async function POST(req: NextRequest) {
  const limited = limitByIp(req, "offer-quote", 60);
  if (limited) return limited;
  const body = (await req.json().catch(() => null)) as { code?: unknown; lines?: unknown } | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const code = normalizeCode(body.code);
  if (!code) return json({ ok: false, error: "That coupon code is not valid." }, 400);
  const parsed = parseCartLines(Array.isArray(body.lines) ? body.lines : [], 20);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);

  const store = db();
  const ids = [...new Set(parsed.lines.map((l) => l.productId))];
  const snaps = ids.length ? await store.getAll(...ids.map((id) => store.collection("products").doc(id))) : [];
  const lines: OfferLine[] = [];
  for (const line of parsed.lines) {
    const snap = snaps.find((s) => s.id === line.productId);
    const built = orderItemFor(snap?.data() as ProductDoc | undefined, line);
    if (!built.ok) return json({ ok: false, error: built.error }, built.status);
    lines.push({ productId: line.productId, category: String((snap?.data() as { category?: unknown } | undefined)?.category ?? ""), total: Number(built.item.totalPrice) });
  }
  const subtotal = lines.reduce((s, l) => s + l.total, 0);

  // The two built-in codes keep their fixed value, as at checkout.
  const builtIn = (COUPON_VALUES as Record<string, number>)[code];
  if (builtIn !== undefined) {
    const discount = Math.min(builtIn, subtotal);
    return json({ ok: true, code, discount, label: `₹${builtIn} off`, subtotal });
  }

  const offer = await findOfferByCode(store, code);
  if (!offer) return json({ ok: false, error: "That coupon code is not valid." }, 400);
  const customer = await customerFrom(req).catch(() => null);
  const usage = await offerUsage(store, offer.code, customer?.uid ?? null);
  const verdict = evaluateOffer(offer, lines, Date.now(), usage);
  if (!verdict.ok) return json({ ok: false, error: verdict.error }, 400);
  return json({ ok: true, code: offer.code, discount: verdict.discount, label: verdict.label, subtotal });
}
