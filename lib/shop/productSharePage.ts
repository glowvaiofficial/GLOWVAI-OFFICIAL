// Reads one published product for its server-rendered share page (app/product/[slug]). Server only. The product comes
// from Firestore (the same products the shop lists), cached for five minutes. A missing product or a failed read gives
// null, and the page falls back to the static catalogue.
import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./server";

export interface SharedProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  description: string;
  picture: string | null;
}

async function readPublishedProduct(id: string): Promise<SharedProduct | null> {
  if (!/^[A-Za-z0-9_-]{1,140}$/.test(id)) return null;
  try {
    const snap = await db().collection("products").doc(id).get();
    const data = snap.data();
    if (!snap.exists || !data || data.status !== "PUBLISHED") return null;
    const pictures = Array.isArray(data.pictures) ? data.pictures : [];
    return {
      id,
      name: String(data.productName ?? ""),
      brand: String(data.brandName ?? ""),
      price: Math.round(Number(data.brandPrice) || 0),
      description: String(data.productDescription ?? ""),
      picture: typeof pictures[0] === "string" ? pictures[0] : null,
    };
  } catch {
    // Admin access not configured, or the read failed: the caller uses the static catalogue instead.
    return null;
  }
}

export const loadSharedProduct = (id: string): Promise<SharedProduct | null> =>
  unstable_cache(() => readPublishedProduct(id), ["shared-product", id], { revalidate: 300 })();
