import { RiderError } from "@/lib/rider/errors";
import { shareLocation } from "@/lib/rider/deliveries";
import { riderRoute } from "@/lib/rider/http";
import { validCoords } from "@/lib/rider/rules";

export const dynamic = "force-dynamic";

// The partner's position, sent every 30 seconds by the page while a delivery is out. Limited to 4 writes a minute per
// partner. Only the last point is kept, and it expires after 15 minutes.
export const POST = riderRoute({ route: "location", write: true, auth: true, partner: { max: 4, windowMs: 60_000 } }, async ({ partner, body }) => {
  const { lat, lng } = body;
  if (typeof lat !== "number" || typeof lng !== "number" || !validCoords(lat, lng)) {
    throw new RiderError("INVALID_INPUT", 400, "The location is not valid.");
  }
  const accuracy = typeof body.accuracy === "number" && Number.isFinite(body.accuracy) ? Math.min(Math.max(body.accuracy, 0), 10_000) : null;
  await shareLocation(partner!.id, lat, lng, accuracy);
  return { body: { sharing: true, everySeconds: 30 } };
});
