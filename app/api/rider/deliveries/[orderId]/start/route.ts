import { riderRoute } from "@/lib/rider/http";
import { checkOrderId, startDelivery } from "@/lib/rider/deliveries";

export const dynamic = "force-dynamic";

// Moves an assigned order to OUT_FOR_DELIVERY and returns the address and the customer's first name.
export const POST = riderRoute<{ orderId: string }>(
  { route: "start", write: true, auth: true, partner: { max: 30, windowMs: 60_000 } },
  async ({ partner, params }) => {
    const orderId = checkOrderId(params.orderId);
    const { order } = await startDelivery(partner!, orderId);
    return { body: { delivery: order } };
  },
);
