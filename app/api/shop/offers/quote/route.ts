import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp } from "@/lib/shop/server";
import { type OfferLine } from "@/lib/shop/offers";
import { resolveBag } from "@/lib/shop/offerResolve";
import { orderItemFor, parseCartLines, type ProductDoc } from "@/lib/shop/variants";

export const dynamic = "force-dynamic";

// What the bag is taken off right now: the best of a built-in code, a typed offer code and the automatic offers. Worked
// out from catalogue prices, never from the phone, and by the same rules as the order. The code is optional: with no
// code, the automatic offers still apply. Public, rate limited. Lines are product id, variant id and quantity.
export async function POST(req: NextRequest) {
  const limited = limitByIp(req, "offer-quote", 60);
  if (limited) return limited;
  const body = (await req.json().catch(() => null)) as { code?: unknown; lines?: unknown } | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const rawCode = typeof body.code === "string" && body.code.trim() !== "" ? body.code.trim() : null;
  if (rawCode !== null && rawCode.length > 40) return json({ ok: false, error: "That coupon code is not valid." }, 400);
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

  const customer = await customerFrom(req).catch(() => null);
  const result = await resolveBag(store, { rawCode, lines, uid: customer?.uid ?? null, now: Date.now() });
  if (!result.ok) return json({ ok: false, error: result.error }, 400);
  const c = result.chosen;
  return json({
    ok: true,
    subtotal,
    chosen: c ? { source: c.source, code: c.code, offerId: c.offerId, discount: c.discount, label: c.label } : null,
  });
}
