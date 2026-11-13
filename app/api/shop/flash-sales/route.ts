import { NextRequest } from "next/server";
import { db, json, limitByIp } from "@/lib/shop/server";
import { loadFlashSales, flashUnitsUsed } from "@/lib/shop/flashPricing";
import { saleUnitPrice } from "@/lib/shop/flashSales";
import { fromPrice, readProductVariants, type ProductDoc } from "@/lib/shop/variants";

export const dynamic = "force-dynamic";

// The flash sales running now, for customers. Public and read only. A sale shows only while it is on and inside its
// window, lists only products that are published, and shows the units left. A sold-out sale is not listed.
// Prices are worked out from the catalogue here. Limit: 120 requests a minute per IP address.
export async function GET(req: NextRequest) {
  const limited = limitByIp(req, "shop-flash-sales", 120);
  if (limited) return limited;
  try {
    const store = db();
    const now = Date.now();
    const live = (await loadFlashSales(store)).filter((s) => now >= s.startsAt && now < s.endsAt);
    const out: {
      id: string;
      name: string;
      endsAt: number;
      discountPercent: number;
      remaining: number | null;
      items: { productId: string; name: string; price: number; salePrice: number }[];
    }[] = [];
    for (const sale of live) {
      const used = await flashUnitsUsed(store, sale.id, null);
      const remaining = sale.stockCap === null ? null : Math.max(0, sale.stockCap - used.sold);
      if (remaining === 0) continue;
      const snaps = await store.getAll(...sale.productIds.map((id) => store.collection("products").doc(id)));
      const items: { productId: string; name: string; price: number; salePrice: number }[] = [];
      for (const snap of snaps) {
        if (!snap.exists) continue;
        const p = snap.data() as ProductDoc & { category?: unknown };
        if (p.status !== "PUBLISHED") continue;
        const stored = readProductVariants(p.variants);
        const price = stored.ok && stored.variants && stored.variants.length > 0 ? fromPrice(stored.variants).price : Math.round(Number(p.brandPrice) || 0);
        if (price <= 0) continue;
        items.push({ productId: snap.id, name: String(p.productName ?? ""), price, salePrice: saleUnitPrice(price, sale.discountPercent) });
      }
      if (items.length === 0) continue;
      out.push({ id: sale.id, name: sale.name, endsAt: sale.endsAt, discountPercent: sale.discountPercent, remaining, items });
    }
    const res = json({ ok: true, sales: out });
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=60");
    return res;
  } catch {
    return json({ ok: true, sales: [] });
  }
}
