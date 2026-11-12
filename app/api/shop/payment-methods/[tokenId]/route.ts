import { NextRequest } from "next/server";
import { json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { logActivity, readPaymentsProfile, writePaymentsProfile } from "@/lib/shop/privacy/store";
import { isTokenId, paymentMethodsEnabled, preferredAfterRemoval } from "@/lib/shop/paymentMethods/rules";
import { deleteRazorpayToken } from "@/lib/shop/paymentMethods/razorpayCustomers";
import { env, gateOff, razorpayFailure } from "@/lib/shop/paymentMethods/service";
import { listRazorpayTokens } from "@/lib/shop/paymentMethods/razorpayCustomers";

export const dynamic = "force-dynamic";

// Removes a saved method. The token must be one Razorpay lists for this customer, so an id from another account is
// refused. Removing the preferred method clears the preference.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ tokenId: string }> }) {
  if (!paymentMethodsEnabled(env())) return gateOff();
  const g = await gate(req, "payment-methods-delete", 20);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const { tokenId } = await ctx.params;
  if (!isTokenId(tokenId)) return json({ ok: false, error: "That payment method is not saved on your account." }, 404);
  const profile = await readPaymentsProfile(uid);
  if (!profile.razorpayCustomerId) return json({ ok: false, error: "That payment method is not saved on your account." }, 404);
  const now = Date.now();
  try {
    const live = (await listRazorpayTokens(env(), profile.razorpayCustomerId)).map((t) => t.id);
    if (!live.includes(tokenId)) return json({ ok: false, error: "That payment method is not saved on your account." }, 404);
    await deleteRazorpayToken(env(), profile.razorpayCustomerId, tokenId);
    await writePaymentsProfile(uid, { preferredTokenId: preferredAfterRemoval(profile.preferredTokenId, tokenId) }, now);
    await logActivity(uid, "PAYMENT_METHOD_REMOVED", "A payment method was removed", now);
    return json({ ok: true });
  } catch (err) {
    return razorpayFailure(err);
  }
}
