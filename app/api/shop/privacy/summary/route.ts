import { NextRequest } from "next/server";
import { json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { accountSummary } from "@/lib/shop/privacy/service";

export const dynamic = "force-dynamic";

// What the account holds: counts of each kind of record and the contact details, masked. Nothing here is internal.
export async function GET(req: NextRequest) {
  const g = await gate(req, "privacy-summary", 30);
  if (g.response) return g.response;
  return json({ ok: true, summary: await accountSummary(g.uid as string) });
}
