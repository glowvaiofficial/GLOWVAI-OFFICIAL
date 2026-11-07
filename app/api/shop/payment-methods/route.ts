import { NextRequest } from "next/server";
import { json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { readPaymentsProfile, writePaymentsProfile } from "@/lib/shop/privacy/store";
import { GATE_OFF_MESSAGE, MAX_SAVED_METHODS, paymentMethodsEnabled } from "@/lib/shop/paymentMethods/rules";
import { ensureCustomer, env, gateOff, razorpayFailure, savedMethods } from "@/lib/shop/paymentMethods/service";
import { createSetupOrder } from "@/lib/shop/paymentMethods/razorpayCustomers";
import { razorpayKeyId } from "@/lib/shop/razorpay";

export const dynamic = "force-dynamic";

// Saved cards and UPI handles, listed from Razorpay's token API. Behind PAYMENT_METHODS_SAVE_ENABLED=true. With the
// setting off, GET says the feature is not available yet and nothing else is called.
export async function GET(req: NextRequest) {
  if (!paymentMethodsEnabled(env())) return json({ ok: true, enabled: false, message: GATE_OFF_MESSAGE, methods: [], max: MAX_SAVED_METHODS });
  const g = await gate(req, "payment-methods-get", 30);
  if (g.response) return g.response;
  try {
    const saved = await savedMethods(g.uid as string);
    return json({ ok: true, enabled: true, methods: saved.methods, max: MAX_SAVED_METHODS, preferredTokenId: saved.preferredTokenId });
  } catch (err) {
    return razorpayFailure(err);
  }
}

// Starts saving a card: makes sure the Razorpay customer exists and creates the setup order. The browser then opens
// Razorpay Checkout with the customer id and save: 1. Card entry happens on Razorpay's page; GlowVai never sees it.
export async function POST(req: NextRequest) {
  if (!paymentMethodsEnabled(env())) return gateOff();
  const g = await gate(req, "payment-methods-post", 10);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const now = Date.now();
  try {
    const saved = await savedMethods(uid);
    if (saved.methods.length >= MAX_SAVED_METHODS) return json({ ok: false, error: `You can save up to ${MAX_SAVED_METHODS} payment methods. Remove one first.` }, 409);
    const profile = await readPaymentsProfile(uid);
    const customerId = await ensureCustomer(uid, profile, now);
    const amountPaise = Math.max(100, Math.floor(Number(env().PAYMENT_METHODS_SETUP_AMOUNT_PAISE) || 100));
    const order = await createSetupOrder(env(), { customerId, amountPaise, receipt: `pm_${now}` });
    await writePaymentsProfile(uid, { pendingSetupOrderId: order.id }, now);
    return json({
      ok: true,
      keyId: razorpayKeyId(),
      orderId: order.id,
      customerId,
      amountPaise,
      currency: "INR",
      checkout: { customer_id: customerId, save: 1 },
    });
  } catch (err) {
    return razorpayFailure(err);
  }
}

