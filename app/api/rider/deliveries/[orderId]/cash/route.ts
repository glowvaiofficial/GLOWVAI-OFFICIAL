import { RiderError } from "@/lib/rider/errors";
import { checkOrderId, recordCash } from "@/lib/rider/deliveries";
import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

// COD: the cash the partner collected. Whole rupees as a number or a plain digit string; the server compares it with the
// order total and refuses any other amount.
export const POST = riderRoute<{ orderId: string }>(
  { route: "cash", write: true, auth: true, partner: { max: 20, windowMs: 60_000 } },
  async ({ partner, params, body }) => {
    const orderId = checkOrderId(params.orderId);
    const raw = body.amount;
    const amount = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,6}$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
    if (!Number.isFinite(amount)) throw new RiderError("AMOUNT_MISMATCH", 400, "Enter the amount collected in whole rupees.");
    const result = await recordCash(partner!, orderId, amount);
    return { body: result };
  },
);
