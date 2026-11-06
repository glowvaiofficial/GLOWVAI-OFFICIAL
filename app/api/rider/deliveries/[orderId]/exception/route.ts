import { checkOrderId, recordException } from "@/lib/rider/deliveries";
import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

// "Mark as delivered without code". Not a delivery: the order stays out for delivery with an open exception for staff.
export const POST = riderRoute<{ orderId: string }>(
  { route: "exception", write: true, auth: true, partner: { max: 20, windowMs: 60_000 } },
  async ({ partner, params, body }) => {
    const orderId = checkOrderId(params.orderId);
    const { order } = await recordException(partner!, orderId, body.reason, body.note);
    return { body: { delivery: order, message: "Recorded. Staff will review this delivery before it is closed." } };
  },
);
