// Razorpay server helpers. Keys come from environment variables only (never committed, never sent to the browser
// except the public key id, which Razorpay Checkout needs):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

// Creates a Razorpay order for an amount in rupees. Razorpay works in paise.
export async function createRazorpayOrder(amountRupees: number, receipt: string): Promise<{ id: string; amount: number; currency: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new Error("NOT_CONFIGURED");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64"),
    },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: "INR", receipt: receipt.slice(0, 40) }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; amount?: number; currency?: string; error?: { description?: string } };
  if (!res.ok || !data.id) throw new Error(data.error?.description || "Razorpay could not create the payment.");
  return { id: data.id, amount: Number(data.amount), currency: String(data.currency) };
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

// Checkout returns order id, payment id and signature. The signature is HMAC-SHA256(orderId|paymentId) with the key secret.
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

// Webhooks are signed with the webhook secret over the exact raw body.
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
