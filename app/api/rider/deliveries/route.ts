import { listAssignments } from "@/lib/rider/assignments";
import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

// The partner's open deliveries only. Rider-safe rows: no customer name, phone or full address.
export const GET = riderRoute({ route: "deliveries", write: false, auth: true, partner: { max: 60, windowMs: 60_000 } }, async ({ partner }) => ({
  body: { deliveries: await listAssignments(partner?.id ?? "") },
}));
