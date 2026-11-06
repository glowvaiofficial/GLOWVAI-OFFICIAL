import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { customerReturnView, RETURN_COLLECTION, RETURN_ID_PATTERN } from "@/lib/shop/returns";
import type { Doc } from "@/lib/shop/orderState";

export const dynamic = "force-dynamic";

// One return request of the signed-in customer. Another customer's request is reported as not found.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "returns-one", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "returns-one", 120);
  if (userLimited) return userLimited;

  const { id } = await params;
  if (!RETURN_ID_PATTERN.test(id)) return json({ ok: false, error: "Return not found." }, 404);
  const snap = await db().collection(RETURN_COLLECTION).doc(id).get();
  const doc = snap.data() as Doc | undefined;
  if (!snap.exists || !doc || doc.uid !== customer.uid) return json({ ok: false, error: "Return not found." }, 404);
  return json({ ok: true, return: customerReturnView(doc, id) });
}
