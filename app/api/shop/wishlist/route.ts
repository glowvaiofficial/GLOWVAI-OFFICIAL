import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser, tooMany } from "@/lib/shop/server";
import { PRODUCT_ID_PATTERN, WISHLIST_MAX } from "@/lib/shop/wishlist";
import { addToWishlist, getWishlist, removeFromWishlist } from "@/lib/shop/wishlistService";
import { wishlistRepo } from "@/lib/shop/wishlistRepo";

export const dynamic = "force-dynamic";

// The customer's saved products, stored under users/{uid}/wishlist (at most 200). The device keeps the same list and
// the two are merged on sign-in (see features/shop/lib/wishlistSync).

export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "wishlist-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wishlist-get", 60);
  if (userLimited) return userLimited;
  return json({ ok: true, items: await getWishlist(wishlistRepo, customer.uid), max: WISHLIST_MAX });
}

// Adds product ids: { productIds: string[] } (up to 200 per request). Items already saved are skipped; `full` lists the
// ids that did not fit under the cap.
export async function PUT(req: NextRequest) {
  const ipLimited = limitByIp(req, "wishlist-put", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wishlist-put", 60);
  if (userLimited) return userLimited;
  if (tooMany(`wishlist-write:${customer.uid}`, 300, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as { productIds?: unknown } | null;
  if (!body || !Array.isArray(body.productIds)) return json({ ok: false, error: "Invalid request." }, 400);
  if (body.productIds.length > WISHLIST_MAX) return json({ ok: false, error: `Up to ${WISHLIST_MAX} products can be sent at once.` }, 400);
  const incoming = body.productIds.filter((v): v is string => typeof v === "string" && PRODUCT_ID_PATTERN.test(v));
  const result = await addToWishlist(wishlistRepo, customer.uid, incoming, Date.now());
  return json({ ok: true, items: result.items, added: result.added, full: result.full, max: WISHLIST_MAX });
}

// Removes one product: { productId }.
export async function DELETE(req: NextRequest) {
  const ipLimited = limitByIp(req, "wishlist-delete", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "wishlist-delete", 120);
  if (userLimited) return userLimited;
  if (tooMany(`wishlist-write:${customer.uid}`, 300, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as { productId?: unknown } | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!PRODUCT_ID_PATTERN.test(productId)) return json({ ok: false, error: "Invalid product." }, 400);
  return json({ ok: true, items: await removeFromWishlist(wishlistRepo, customer.uid, productId), max: WISHLIST_MAX });
}
