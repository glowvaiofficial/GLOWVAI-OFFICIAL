import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db, json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { takeAttempt } from "@/lib/shop/privacy/store";
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from "@/lib/shop/razorpay";
import { PURCHASE_MAX_PER_DAY, validateGiftAmount, validateGiftDetails } from "@/lib/shop/giftCards/rules";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Starts a gift card purchase: validates the amount and the recipient, then creates a Razorpay order for the amount.
// The card is issued only after the payment is verified on the server (see purchase/verify). Ten purchases a day per account.
export async function POST(req: NextRequest) {
  const g = await gate(req, "gift-card-purchase", 10);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const amount = validateGiftAmount(body.amount);
  if (!amount.ok) return json({ ok: false, error: amount.error }, 400);
  const details = validateGiftDetails({ recipientName: body.recipientName, message: body.message });
  if (!details.ok) return json({ ok: false, error: details.error }, 400);
  if (!razorpayConfigured()) return json({ ok: false, error: "Gift cards are not available yet." }, 503);

  const now = Date.now();
  const daily = await takeAttempt(`gc-purchase:${uid}`, PURCHASE_MAX_PER_DAY, DAY_MS, now);
  if (!daily.allowed) return json({ ok: false, error: `You can buy up to ${PURCHASE_MAX_PER_DAY} gift cards a day. Try again tomorrow.` }, 429);

  const purchaseId = `gcp_${randomBytes(10).toString("hex")}`;
  const ref = db().collection("giftCardPurchases").doc(purchaseId);
  await ref.set({ uid, status: "PENDING_PAYMENT", amountRupees: amount.rupees, recipientName: details.recipientName, message: details.message, createdAt: now });
  try {
    const order = await createRazorpayOrder(amount.rupees, purchaseId);
    await ref.update({ razorpayOrderId: order.id });
    return json({ ok: true, purchaseId, razorpayOrderId: order.id, amountPaise: order.amount, currency: order.currency, keyId: razorpayKeyId() });
  } catch {
    await ref.update({ status: "FAILED", updatedAt: Date.now() });
    return json({ ok: false, error: "The payment could not be started. Try again in a moment." }, 502);
  }
}

