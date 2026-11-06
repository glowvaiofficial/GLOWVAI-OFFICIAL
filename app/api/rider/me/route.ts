import { firstNameOf } from "@/lib/rider/auth";
import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

export const GET = riderRoute({ route: "me", write: false, auth: true }, async ({ partner }) => ({
  body: { partner: { firstName: firstNameOf(partner?.name ?? "") } },
}));
