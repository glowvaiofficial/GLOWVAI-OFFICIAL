import { randomBytes } from "node:crypto";
import { db } from "@/lib/shop/server";
import { invalid } from "@/lib/vendor/errors";
import { perHour, perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { isMine } from "@/lib/vendor/orders";
import { loadVendor } from "@/lib/vendor/store";
import { parseTicket } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

const LIST_LIMIT = 30;
const ESCALATE = new Set(["SUSPECTED_COUNTERFEIT", "PRODUCT_SAFETY"]);
const SLA_HOURS: Record<string, number> = { URGENT: 2, HIGH: 8, NORMAL: 24, LOW: 72 };

// My support tickets, newest first. Internal notes and staff assignment never leave the server.
export const GET = vendorRoute({ route: "support-get", ip: perMinute(30), user: perMinute(30) }, async ({ me }) => {
  const snap = await db().collection("admin_tickets").where("vendorId", "==", me.applicationId).limit(LIST_LIMIT).get();
  const tickets = snap.docs
    .map((d) => {
      const t = d.data() as Doc;
      return {
        id: String(t.id ?? d.id),
        subject: String(t.subject ?? ""),
        category: String(t.category ?? ""),
        status: String(t.status ?? "OPEN"),
        orderId: (t.orderId as string | null) ?? null,
        createdAt: String(t.createdAt ?? ""),
        resolution: (t.resolution as string | null) ?? null,
        messages: (Array.isArray(t.messages) ? t.messages : []).map((m: Doc) => ({ at: m.at, kind: m.kind, text: m.text })),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { tickets };
});

// Opens a ticket in the admin panel (Customer Support and Trust), in the admin's own ticket shape.
export const POST = vendorRoute({ route: "support-post", ip: perMinute(10), user: perHour(5) }, async ({ req, me }) => {
  const parsed = parseTicket(await readJson(req));
  if (!parsed.ok) throw invalid(parsed.error, { field: parsed.field });
  const { category, subject, description, orderId } = parsed.value;

  const store = db();
  if (orderId) {
    const order = await store.collection("orders").doc(orderId).get();
    if (!order.exists || !isMine(order.data() as Doc, me.uid)) throw invalid("That order is not one of your store's orders.", { field: "orderId" });
  }
  const record = await loadVendor(me.uid);
  const storeName = String(record.app?.storeName ?? "") || me.email;

  const escalated = ESCALATE.has(category);
  const priority = escalated ? "URGENT" : "NORMAL";
  const now = new Date();
  const createdAt = now.toISOString();
  const id = `TKT-VND-${now.getTime().toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;
  const ticket = {
    id,
    customerId: null,
    vendorId: me.applicationId,
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
    assignee: null,
    escalated,
    internalNotes: [],
    messages: [],
    attachments: [],
    linkedRefundOrReturn: null,
    requestedBy: me.applicationId,
    reopenCount: 0,
    history: [{ at: createdAt, actor: `Vendor ${storeName}`, event: escalated ? "Created from the vendor app and escalated automatically" : "Created from the vendor app" }],
  };
  await store.collection("admin_tickets").doc(id).create(ticket);
  return { ticketId: id };
});

export const OPTIONS = preflight;
