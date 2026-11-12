import { NextRequest } from "next/server";
import { json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { readPaymentsProfile, writePaymentsProfile } from "@/lib/shop/privacy/store";
import { choosePreferred } from "@/lib/shop/paymentMethods/rules";
import { env, gateOff, razorpayFailure } from "@/lib/shop/paymentMethods/service";
import { listRazorpayTokens } from "@/lib/shop/paymentMethods/razorpayCustomers";
import { paymentMethodsEnabled } from "@/lib/shop/paymentMethods/rules";

export const dynamic = "force-dynamic";

// Sets the preferred saved method (a token id from the list), or clears it with tokenId: null.
export async function POST(req: NextRequest) {
  if (!paymentMethodsEnabled(env())) return gateOff();
  const g = await gate(req, "payment-methods-preferred", 20);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const body = (await req.json().catch(() => null)) as { tokenId?: unknown } | null;
  if (!body || !("tokenId" in body)) return json({ ok: false, error: "Invalid request." }, 400);
  const profile = await readPaymentsProfile(uid);
  try {
    const live = profile.razorpayCustomerId ? (await listRazorpayTokens(env(), profile.razorpayCustomerId)).map((t) => t.id) : [];
    const chosen = choosePreferred(body.tokenId, live);
    if (!chosen.ok) return json({ ok: false, error: chosen.error }, 404);
    await writePaymentsProfile(uid, { preferredTokenId: chosen.tokenId }, Date.now());
    return json({ ok: true, preferredTokenId: chosen.tokenId });
  } catch (err) {
    return razorpayFailure(err);
  }
}
