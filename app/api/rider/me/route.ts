import { firstNameOf } from "@/lib/rider/auth";
import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

export const GET = riderRoute({ route: "me", write: false, auth: true, ip: { max: 60, windowMs: 60_000 }, partner: { max: 60, windowMs: 60_000 } }, async ({ partner }) => ({
  body: { partner: { firstName: firstNameOf(partner?.name ?? "") } },
}));
