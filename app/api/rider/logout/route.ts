import { riderRoute } from "@/lib/rider/http";

export const dynamic = "force-dynamic";

// Ends the rider session on this device. Needs no session itself, so a stale cookie can always be cleared.
export const POST = riderRoute({ route: "logout", write: true, auth: false }, async () => ({ body: {}, cookie: { clear: true } }));
