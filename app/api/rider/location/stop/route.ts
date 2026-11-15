import { stopLocation } from "@/lib/rider/deliveries";
import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

// Stops sharing and removes the stored point.
export const POST = riderRoute({ route: "location-stop", write: true, auth: true, ip: { max: 40, windowMs: 60_000 }, partner: { max: 20, windowMs: 60_000 } }, async ({ partner }) => {
  await stopLocation(partner!.id);
  return { body: { sharing: false } };
});
