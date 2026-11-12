import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { firestoreRepo } from "@/lib/shop/growth/firestoreRepo";
import { transition, type SubscriptionAction } from "@/lib/shop/growth/subscriptions";
import { GROWTH_CONFIG } from "@/lib/shop/growth-config";
import { recordActivity } from "@/lib/shop/activity";

export const dynamic = "force-dynamic";

const ACTIONS: readonly SubscriptionAction[] = ["pause", "resume", "cancel", "quantity"];
const HOUR_MS = 60 * 60 * 1000;

// Pause, resume, change quantity or cancel one of the customer's own subscriptions. Anyone else's id reads as not found.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "subscriptions-item", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "subscriptions-write", GROWTH_CONFIG.subscriptions.writesPerUserPerHour, HOUR_MS);
  if (userLimited) return userLimited;

  const { id } = await params;
  if (!/^sub_[a-f0-9]{20}$/.test(id)) return json({ ok: false, error: "Subscription not found." }, 404);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action ?? "") as SubscriptionAction;
  if (!ACTIONS.includes(action)) return json({ ok: false, error: "Choose a change to make." }, 400);

  const repo = firestoreRepo(db());
  const ref = repo.ref(`subscriptions/${id}`);
  const now = Date.now();
  const result = await repo.runTx(async (tx) => {
    const snap = await tx.get(ref);
    const sub = snap.data();
    if (!snap.exists || !sub || sub.uid !== customer.uid) return { ok: false as const, status: 404, error: "Subscription not found." };
    const t = transition(sub, action, now, { quantity: body?.quantity });
    if (!t.ok) return { ok: false as const, status: t.code === "INVALID_QUANTITY" ? 400 : 409, error: t.message };
    tx.set(ref, { ...t.patch, updatedAt: now }, { merge: true });
    return { ok: true as const, status: 200, error: "" };
  });
  if (!result.ok) return json({ ok: false, error: result.error }, result.status);
  await recordActivity(customer.uid, "subscription_changed", now);
  return json({ ok: true });
}
