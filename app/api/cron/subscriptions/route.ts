import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db, json } from "@/lib/shop/server";
import { placeOrderCore } from "@/lib/shop/orderCore";
import type { DeliveryAddress } from "@/lib/shop/orderRequest";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { runSubscriptionCycle } from "@/lib/shop/growth/subscriptions";
import { bearerToken, sameSecret } from "@/lib/shop/growth/secrets";

export const dynamic = "force-dynamic";

// Daily run (vercel.json: 02:30 UTC, which is 08:00 IST). Creates the orders for subscriptions that are due, through the
// same order helper the checkout uses (cash on delivery). Only Vercel Cron, with the CRON_SECRET bearer token, may run it.
// The response carries counts and skip reasons only: no customer names, phones or addresses.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return json({ ok: false, error: "The subscription run is not configured." }, 503);
  if (!sameSecret(bearerToken(req.headers.get("authorization")), secret)) return json({ ok: false, error: "Not authorised." }, 401);

  const store = db();
  const summary = await runSubscriptionCycle({
    repo: firestoreRepo(store),
    now: Date.now(),
    runId: randomUUID(),
    createOrder: async (sub, orderId) => {
      const result = await placeOrderCore(store, {
        uid: sub.uid,
        lines: [{ productId: sub.productId, variantId: sub.variantId, quantity: sub.quantity }],
        addressId: null,
        address: sub.address as DeliveryAddress,
        deliverySlotId: null,
        paymentMethod: "COD",
        couponCode: "",
        tipRaw: 0,
        coinsRequested: 0,
        subscriptionId: sub.id,
        orderId,
      });
      if (result.ok) return { ok: true, orderId };
      return { ok: false, code: result.code === "UNAVAILABLE" ? "PRODUCT_NOT_PUBLISHED" : result.code };
    },
  });
  return json({ ok: true, ...summary });
}
