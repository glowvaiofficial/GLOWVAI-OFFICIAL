import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { customerFrom, db, json, text, tooMany } from "@/lib/shop/server";

export const dynamic = "force-dynamic";

// Support requests from the shop become tickets in the GlowVai admin panel (Customer Support and Trust), in the same
// shape the admin creates them: category, priority, SLA deadline, history. Counterfeit and safety complaints are
// escalated automatically, as in the admin.
const CATEGORIES = [
  "ORDER_DELAY",
  "VENDOR_CANCELLATION",
  "WRONG_PRODUCT",
  "MISSING_PRODUCT",
  "DAMAGED_PRODUCT",
  "SUSPECTED_COUNTERFEIT",
  "DELIVERY_PROBLEM",
  "PAYMENT_ISSUE",
  "REFUND_ISSUE",
  "ACCOUNT_ISSUE",
  "PRIVACY_REQUEST",
  "SKIN_ANALYSIS_FAILURE",
  "RECOMMENDATION_CONCERN",
  "PRODUCT_SAFETY",
] as const;
const ESCALATE = new Set(["SUSPECTED_COUNTERFEIT", "PRODUCT_SAFETY"]);
const SLA_HOURS: Record<string, number> = { URGENT: 2, HIGH: 8, NORMAL: 24, LOW: 72 };

export async function GET(req: NextRequest) {
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const snap = await db().collection("admin_tickets").where("customerId", "==", customer.uid).limit(50).get();
  // Only customer-visible fields: internal notes and staff assignment never leave the server.
  const tickets = snap.docs
    .map((d) => {
      const t = d.data();
      return {
        id: t.id ?? d.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        orderId: t.orderId ?? null,
        createdAt: t.createdAt,
        resolution: t.resolution ?? null,
        messages: (t.messages ?? []).map((m: Record<string, unknown>) => ({ at: m.at, kind: m.kind, text: m.text })),
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return json({ ok: true, tickets });
}

export async function POST(req: NextRequest) {
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  if (tooMany(`ticket:${customer.uid}`, 5, 60 * 60 * 1000)) return json({ ok: false, error: "Too many requests. Try again later." }, 429);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const category = text(body.category, 40);
  if (!(CATEGORIES as readonly string[]).includes(category)) return json({ ok: false, error: "Choose what the problem is about." }, 400);
  const subject = text(body.subject, 120);
  const description = text(body.description, 2000);
  if (subject.length < 3) return json({ ok: false, error: "Add a short subject." }, 400);
  if (description.length < 10) return json({ ok: false, error: "Describe the problem in a sentence or two." }, 400);

  const store = db();
  const orderId = text(body.orderId, 40) || null;
  if (orderId) {
    const order = await store.collection("orders").doc(orderId).get();
    if (!order.exists || order.data()?.userId !== customer.uid) return json({ ok: false, error: "That order is not on your account." }, 400);
  }

  const escalated = ESCALATE.has(category);
  const priority = escalated ? "URGENT" : "NORMAL";
  const now = new Date();
  const createdAt = now.toISOString();
  const id = `TKT-APP-${now.getTime().toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;
  const ticket = {
    id,
    customerId: customer.uid,
    orderId,
    category,
    status: "OPEN",
    priority,
    channel: "APP",
    subject,
    description,
    amount: null,
    resolution: null,
    createdAt,
    dueAt: new Date(now.getTime() + SLA_HOURS[priority] * 3600000).toISOString(),
    // Unassigned until a support executive picks it up in the admin panel.
    assignee: null,
    escalated,
    internalNotes: [],
    messages: [],
    attachments: [],
    linkedRefundOrReturn: null,
    requestedBy: null,
    reopenCount: 0,
    history: [{ at: createdAt, actor: "Customer (shop)", event: escalated ? "Created from the shop and escalated automatically" : "Created from the shop" }],
  };
  await store.collection("admin_tickets").doc(id).create(ticket);
  return json({ ok: true, ticketId: id });
}
