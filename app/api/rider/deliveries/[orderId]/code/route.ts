import { RiderError } from "@/lib/rider/errors";
import { checkOrderId, completeWithCode } from "@/lib/rider/deliveries";
import { riderRoute } from "@/lib/rider/http";
import { CODE_PATTERN } from "@/lib/rider/pin";

export const dynamic = "force-dynamic";

// Completes the delivery with the customer's 4-digit code. The code is never echoed back or logged.
export const POST = riderRoute<{ orderId: string }>(
  { route: "code", write: true, auth: true, ip: { max: 40, windowMs: 60_000 }, partner: { max: 20, windowMs: 60_000 } },
  async ({ partner, params, body }) => {
    const orderId = checkOrderId(params.orderId);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!CODE_PATTERN.test(code)) throw new RiderError("INVALID_INPUT", 400, "Enter the 4-digit delivery code.");
    const outcome = await completeWithCode(partner!, orderId, code);
    if (outcome.delivered) return { body: { delivery: outcome.order } };
    if (outcome.lockedMs > 0) {
      throw new RiderError("CODE_LOCKED", 423, "Too many wrong codes. This code is locked for 30 minutes. You can record a delivery exception meanwhile.", 30 * 60);
    }
    throw new RiderError(
      "WRONG_CODE",
      400,
      `That code is not right. ${outcome.attemptsLeft} ${outcome.attemptsLeft === 1 ? "try" : "tries"} left before the code locks for 30 minutes.`,
    );
  },
);
