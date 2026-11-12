import { NextRequest } from "next/server";
import { db, json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { verifyPaymentSignature } from "@/lib/shop/razorpay";
import { issueGiftCard } from "@/lib/shop/giftCards/service";
import { formatGiftCode, generateGiftCode, lastFourOf } from "@/lib/shop/giftCards/rules";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { logActivity } from "@/lib/shop/privacy/store";

export const dynamic = "force-dynamic";

// Confirms a gift card payment and issues the card. The Razorpay signature is checked first (the same check the order
// payments use). The card is created once per purchase. The full code is returned in this response only: GlowVai keeps
// a salted hash, so a repeat call for an issued purchase returns the card id and no code.
export async function POST(req: NextRequest) {
  const g = await gate(req, "gift-card-verify", 30);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const purchaseId = typeof body?.purchaseId === "string" ? body.purchaseId : "";
  const orderId = String(body?.razorpay_order_id ?? "");
  const paymentId = String(body?.razorpay_payment_id ?? "");
  const signature = String(body?.razorpay_signature ?? "");
  if (!/^gcp_[a-f0-9]{20}$/.test(purchaseId)) return json({ ok: false, error: "Order not found." }, 404);
  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    return json({ ok: false, error: "We could not confirm this payment. If money was taken, our team will sort it out." }, 400);
  }
  const code = generateGiftCode();
  const now = Date.now();
  const outcome = await issueGiftCard(firestoreRepo(db()), { purchaseId, uid, razorpayOrderId: orderId, paymentId, code, now });
  if (!outcome.ok) {
    const status = outcome.code === "NOT_FOUND" ? 404 : 409;
    return json({ ok: false, error: outcome.code === "NOT_FOUND" ? "Order not found." : "This payment cannot be used for a gift card." }, status);
  }
  if (outcome.alreadyIssued) return json({ ok: true, alreadyIssued: true, cardId: outcome.cardId });
  await logActivity(uid, "GIFT_CARD_BOUGHT", "A gift card was bought", now);
  return json({ ok: true, alreadyIssued: false, cardId: outcome.cardId, code: formatGiftCode(code), lastFour: lastFourOf(code) });
}
