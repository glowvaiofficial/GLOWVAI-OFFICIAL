import { NextRequest } from "next/server";
import { json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { logActivity, readPaymentsProfile, writePaymentsProfile } from "@/lib/shop/privacy/store";
import { isPaymentId, paymentMethodsEnabled, savedTokenFromPayment } from "@/lib/shop/paymentMethods/rules";
import { env, gateOff, razorpayFailure } from "@/lib/shop/paymentMethods/service";
import { fetchRazorpayPayment } from "@/lib/shop/paymentMethods/razorpayCustomers";

export const dynamic = "force-dynamic";

// After Razorpay Checkout saved a card, the browser sends the payment id here. The server asks Razorpay for that payment
// and keeps the token id only when the payment belongs to this customer and to the setup order created for them.
export async function POST(req: NextRequest) {
  if (!paymentMethodsEnabled(env())) return gateOff();
  const g = await gate(req, "payment-methods-confirm", 20);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const body = (await req.json().catch(() => null)) as { paymentId?: unknown } | null;
  if (!body || !isPaymentId(body.paymentId)) return json({ ok: false, error: "Invalid request." }, 400);
  const profile = await readPaymentsProfile(uid);
  if (!profile.razorpayCustomerId || !profile.pendingSetupOrderId) return json({ ok: false, error: "Start adding a payment method first." }, 409);
  const now = Date.now();
  try {
    const payment = await fetchRazorpayPayment(env(), body.paymentId);
    const saved = savedTokenFromPayment(payment, { customerId: profile.razorpayCustomerId, orderId: profile.pendingSetupOrderId });
    if (!saved.ok) return json({ ok: false, error: saved.error }, 400);
    await writePaymentsProfile(uid, { pendingSetupOrderId: null }, now);
    await logActivity(uid, "PAYMENT_METHOD_ADDED", "A payment method was saved", now);
    return json({ ok: true });
  } catch (err) {
    return razorpayFailure(err);
  }
}
