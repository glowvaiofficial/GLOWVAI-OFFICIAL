import { NextRequest } from "next/server";
import { json } from "@/lib/shop/server";
import { gate } from "@/lib/shop/privacy/http";
import { DELETION_TIMING, nextDeletionStatus } from "@/lib/shop/privacy/rules";
import { changeDeletion, latestDeletion, logActivity, takeAttempt } from "@/lib/shop/privacy/store";

export const dynamic = "force-dynamic";

// Account deletion requests. A request creates deletionRequests/{id} with status REQUESTED. The customer can cancel it
// until the GlowVai team starts processing it. The deletion itself is an admin-run process: this route never deletes
// anything. The process and timing shown are those in the privacy policy.
const REQUESTS_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const view = (r: Awaited<ReturnType<typeof latestDeletion>>) =>
  r
    ? { id: r.id, status: r.status, requestedAt: r.requestedAt, cancelledAt: r.cancelledAt }
    : null;

export async function GET(req: NextRequest) {
  const g = await gate(req, "privacy-deletion-get", 30);
  if (g.response) return g.response;
  return json({ ok: true, request: view(await latestDeletion(g.uid as string)), timing: DELETION_TIMING });
}

export async function POST(req: NextRequest) {
  const g = await gate(req, "privacy-deletion-post", 10);
  if (g.response) return g.response;
  const uid = g.uid as string;
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  const action = body?.action;
  if (action !== "request" && action !== "cancel") return json({ ok: false, error: "Choose to request or cancel deletion." }, 400);

  const now = Date.now();
  const limit = await takeAttempt(`deletion:${uid}`, REQUESTS_PER_DAY, DAY_MS, now);
  if (!limit.allowed) return json({ ok: false, error: "Too many changes today. Try again tomorrow." }, 429);

  const result = await changeDeletion(uid, (rows) => {
    const latest = rows[0]?.status ?? null;
    const step = nextDeletionStatus(latest, action);
    if (!step.ok) {
      if (step.code === "ALREADY_REQUESTED") return { refuse: "You have already asked us to delete your account. You can cancel that request below." };
      return { refuse: "This request can no longer be cancelled, because the GlowVai team has started processing it." };
    }
    if (action === "request") return { write: { create: true, status: step.status, requestedAt: now } };
    return { write: { id: rows[0].id, status: step.status, cancelledAt: now } };
  });
  if (!result.ok) return json({ ok: false, error: result.error }, 409);
  await logActivity(uid, action === "request" ? "DELETION_REQUESTED" : "DELETION_CANCELLED", "Account deletion", now);
  return json({ ok: true, request: view(result.record), timing: DELETION_TIMING });
}
