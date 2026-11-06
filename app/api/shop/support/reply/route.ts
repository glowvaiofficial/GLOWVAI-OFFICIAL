import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser, text } from "@/lib/shop/server";
import { createWindowLimiter, decideCustomerReply, validateCustomerReply } from "@/lib/shop/support";

export const dynamic = "force-dynamic";

// A customer may send 10 replies an hour. Counted per signed-in customer, for every attempt.
const replyLimit = createWindowLimiter(10, 60 * 60 * 1000);
const TICKET_ID = /^TKT-[A-Za-z0-9-]{1,60}$/;

// Adds the customer's reply to one of their own requests. The admin panel shows it as a customer message.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "support-reply", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "support", 60);
  if (userLimited) return userLimited;
  if (!replyLimit.allow(customer.uid, Date.now())) {
    return json({ ok: false, error: "You have sent too many replies. Try again later." }, 429);
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const ticketId = text(body.ticketId, 80);
  if (!TICKET_ID.test(ticketId)) return json({ ok: false, error: "That request could not be found." }, 404);
  const checked = validateCustomerReply(body.text);
  if (!checked.ok) return json({ ok: false, error: checked.error }, 400);

  const ref = db().collection("admin_tickets").doc(ticketId);
  // The read and the write happen in one transaction, so a staff reply made at the same moment is not overwritten.
  const decision = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = decideCustomerReply(snap.exists ? (snap.data() as Record<string, unknown>) : undefined, customer.uid, checked.text, new Date().toISOString());
    if (d.code === 200) tx.update(ref, { messages: d.messages, status: d.status, updatedAt: d.message.at });
    return d;
  });

  if (decision.code === 404) return json({ ok: false, error: "That request could not be found." }, 404);
  if (decision.code === 409) {
    const error =
      decision.reason === "full"
        ? "This request has reached its message limit. Start a new request."
        : "This request is closed. Start a new request if you still need help.";
    return json({ ok: false, error }, 409);
  }
  return json({ ok: true, message: decision.message });
}
