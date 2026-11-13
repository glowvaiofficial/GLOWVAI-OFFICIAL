// Reads one published live product for its share page. Server-only: uses the Admin SDK, like the shop API.
import "server-only";
import { db } from "./server";

export interface LiveProductForShare {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number | null;
  image: string | null;
}

// Mirrors the shop feed: only products with status PUBLISHED are shown to customers, so only those get a share page.
export async function loadPublishedProductForShare(id: string): Promise<LiveProductForShare | null> {
  const snap = await db().collection("products").doc(id).get();
  if (!snap.exists) return null;
  const d = snap.data() ?? {};
  if (d.status !== "PUBLISHED") return null;
  const name = String(d.productName ?? "").trim();
  if (!name) return null;
  const pictures = Array.isArray(d.pictures) ? (d.pictures as unknown[]) : [];
  const first = typeof pictures[0] === "string" ? pictures[0] : null;
  const price = Number(d.brandPrice);
  return {
    id,
    name,
    brand: String(d.brandName ?? "").trim(),
    description: String(d.productDescription ?? ""),
    price: Number.isFinite(price) && price > 0 ? price : null,
    image: first,
  };
}
