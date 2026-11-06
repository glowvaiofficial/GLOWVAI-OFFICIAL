import { NextRequest } from "next/server";
import { json, limitByIp } from "@/lib/shop/server";
import { emiAvailable } from "@/glowvai-app/shared/payment-options.mjs";

export const dynamic = "force-dynamic";

// Public switches the shop shows. EMI is offered only when the server flag RAZORPAY_EMI_ENABLED is "true" (set in the
// Vercel project, and enabled for the Razorpay account in the Razorpay dashboard). When the flag is off, nothing says
// EMI is available and the checkout does not ask Razorpay for EMI.
export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "config-get", 120);
  if (ipLimited) return ipLimited;
  return json({ ok: true, payments: { emi: { available: emiAvailable(process.env) } } });
}
