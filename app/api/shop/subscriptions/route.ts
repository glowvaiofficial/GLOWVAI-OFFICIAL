import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { parseDeliveryAddress } from "@/lib/shop/orderRequest";
import { readProductVariants, resolveVariant } from "@/lib/shop/variants";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { firstRunAt, validateSubscriptionInput } from "@/lib/shop/growth/subscriptions";
import { GROWTH_CONFIG } from "@/lib/shop/growth-config";
import { canSubscribeTo } from "@/lib/shop/subscribable";

export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;

// The customer's own subscriptions (newest first). Addresses are shown as the customer entered them.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "subscriptions-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "subscriptions-get", 60);
  if (userLimited) return userLimited;

  const repo = firestoreRepo(db());
  const rows = await repo.query("subscriptions", [["uid", "==", customer.uid]], { limit: 50 });
  const subscriptions = rows
    .map((r) => {
      const d = r.data() ?? {};
      return {
        id: r.id,
        productId: String(d.productId ?? ""),
        productName: String(d.productName ?? ""),
        quantity: Number(d.quantity ?? 0),
        intervalWeeks: Number(d.intervalWeeks ?? 0),
        status: String(d.status ?? ""),
        nextRunAt: typeof d.nextRunAt === "number" ? d.nextRunAt : null,
        lastSkipReason: typeof d.lastSkipReason === "string" ? d.lastSkipReason : null,
        createdAt: Number(d.createdAt ?? 0),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  return json({ ok: true, subscriptions });
}

// Starts a subscription: a product, a quantity (1 to 5) and an interval (every 2, 4 or 8 weeks), with a delivery address.
// The product is checked as published and priced; the first delivery is one interval from now.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "subscriptions-post", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "subscriptions-write", GROWTH_CONFIG.subscriptions.writesPerUserPerHour, HOUR_MS);
  if (userLimited) return userLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const input = validateSubscriptionInput(body);
  if (!input.ok) return json({ ok: false, error: input.error }, 400);
  const address = parseDeliveryAddress(body.address);
  if (!address.ok) return json({ ok: false, error: address.error }, address.status);

  const store = db();
  const product = await store.collection("products").doc(input.value.productId).get();
  const p = product.data();
  if (!product.exists || !p || p.status !== "PUBLISHED") {
    return json({ ok: false, error: "That product is not available to subscribe to." }, 409);
  }
  // Only products the admin has marked subscribable (default: none).
  if (!canSubscribeTo(p)) {
    return json({ ok: false, error: "That product is not available to subscribe to." }, 409);
  }
  // A product sold in sizes or shades needs the one the customer picked; it is priced and checked on that variant at each run.
  const stored = readProductVariants(p.variants);
  if (!stored.ok) return json({ ok: false, error: "That product is not available to subscribe to." }, 409);
  const pick = resolveVariant(stored.variants, body.variantId);
  if (!pick.ok) return json({ ok: false, error: pick.error }, 409);
  const unitPrice = pick.variant ? pick.variant.price : Math.round(Number(p.brandPrice) || 0);
  if (!(unitPrice > 0)) {
    return json({ ok: false, error: "That product is not available to subscribe to." }, 409);
  }

  const repo = firestoreRepo(store);
  const existing = await repo.query("subscriptions", [["uid", "==", customer.uid]], { limit: 100 });
  const active = existing.filter((r) => r.data()?.status !== "CANCELLED").length;
  if (active >= GROWTH_CONFIG.subscriptions.maxActivePerUser) {
    return json({ ok: false, error: `You can have up to ${GROWTH_CONFIG.subscriptions.maxActivePerUser} active subscriptions.` }, 409);
  }

  const now = Date.now();
  const id = `sub_${randomBytes(10).toString("hex")}`;
  await repo.runTx(async (tx) => {
    tx.create(repo.ref(`subscriptions/${id}`), {
      id,
      uid: customer.uid,
      productId: input.value.productId,
      variantId: pick.variant?.id ?? null,
      variantLabel: pick.variant?.label ?? null,
      productName: String(p.productName ?? "").slice(0, 200),
      quantity: input.value.quantity,
      intervalWeeks: input.value.intervalWeeks,
      status: "ACTIVE",
      nextRunAt: firstRunAt(now, input.value.intervalWeeks),
      address: address.value,
      lastOrderId: null,
      lastRunAt: null,
      lastSkipReason: null,
      createdAt: now,
      updatedAt: now,
    });
  });
  return json({ ok: true, subscriptionId: id });
}
