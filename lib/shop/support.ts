// Customer support requests: what the customer may see, and the rules for a customer reply. Pure functions, no server
// imports, so the tests run them directly. The admin panel (Customer Support and Trust) writes the same ticket documents
// in "admin_tickets"; this file decides what of them leaves the server.

export const REPLY_MAX_LENGTH = 2000;
// A ticket stops taking replies at this many messages, so one ticket cannot grow without limit.
export const MAX_MESSAGES = 200;

export type CustomerMessageKind = "STAFF" | "CUSTOMER";

export interface CustomerMessage {
  at: string;
  kind: CustomerMessageKind;
  text: string;
  evidenceRequest: boolean;
}

// Exactly the fields the customer may see. Internal notes, the owner, history, priority, escalation, the SLA deadline and
// the amount are never copied here.
export interface CustomerTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  orderId: string | null;
  createdAt: string;
  resolution: string | null;
  messages: CustomerMessage[];
}

type Doc = Record<string, unknown>;

const STAFF_KINDS = new Set(["STAFF", "RESPONSE", "EVIDENCE_REQUEST"]);

// Firestore Timestamp or ISO text -> ISO text. Anything else -> "".
export function isoText(v: unknown): string {
  if (typeof v === "string") return v;
  const t = v as { toDate?: () => Date } | null;
  if (t && typeof t.toDate === "function") return t.toDate().toISOString();
  return "";
}

// Keeps only customer-visible messages, oldest first. Staff replies and evidence requests read as STAFF. Customer messages
// are kept as CUSTOMER. Anything else (such as an internal entry) is dropped.
export function customerMessages(raw: unknown): CustomerMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomerMessage[] = [];
  for (const item of raw) {
    const m = (item && typeof item === "object" ? item : {}) as Doc;
    const kind = typeof m.kind === "string" ? m.kind : "";
    const body = typeof m.text === "string" ? m.text : "";
    if (!body) continue;
    if (kind === "CUSTOMER") out.push({ at: isoText(m.at), kind: "CUSTOMER", text: body, evidenceRequest: false });
    else if (STAFF_KINDS.has(kind)) out.push({ at: isoText(m.at), kind: "STAFF", text: body, evidenceRequest: kind === "EVIDENCE_REQUEST" || m.evidenceRequest === true });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export function customerTicket(doc: Doc, fallbackId = ""): CustomerTicket {
  return {
    id: typeof doc.id === "string" && doc.id ? doc.id : fallbackId,
    subject: typeof doc.subject === "string" ? doc.subject : "",
    category: typeof doc.category === "string" ? doc.category : "",
    status: typeof doc.status === "string" ? doc.status : "OPEN",
    orderId: typeof doc.orderId === "string" && doc.orderId ? doc.orderId : null,
    createdAt: isoText(doc.createdAt),
    resolution: typeof doc.resolution === "string" && doc.resolution ? doc.resolution : null,
    messages: customerMessages(doc.messages),
  };
}

// Open requests take replies. A closed or resolved request does not; the customer starts a new one instead.
export function canCustomerReply(status: string): boolean {
  return status === "OPEN" || status === "IN_PROGRESS" || status === "WAITING_CUSTOMER";
}

// A reply to "waiting for you" hands the request back to the team.
export function statusAfterCustomerReply(status: string): string {
  return status === "WAITING_CUSTOMER" ? "IN_PROGRESS" : status;
}

// Returns the trimmed reply, or an error for the customer. The 2000 character limit applies after trimming spaces.
export function validateCustomerReply(input: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof input !== "string") return { ok: false, error: "Write your reply first." };
  const body = input.trim();
  if (!body) return { ok: false, error: "Write your reply first." };
  if (body.length > REPLY_MAX_LENGTH) return { ok: false, error: `Replies can be up to ${REPLY_MAX_LENGTH} characters.` };
  return { ok: true, text: body };
}

// Fixed-window limiter, kept per key (for example per customer). Pure: the clock is passed in.
export function createWindowLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    allow(key: string, now: number): boolean {
      const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (list.length >= max) {
        hits.set(key, list);
        return false;
      }
      list.push(now);
      hits.set(key, list);
      return true;
    },
  };
}

// What a customer reply does to a stored request. Missing requests and requests that belong to someone else both get 404,
// so request ids cannot be probed. Closed or full requests get 409. Otherwise the reply is appended and the status moves.
export type ReplyDecision =
  | { code: 404 }
  | { code: 409; reason: "closed" | "full" }
  | { code: 200; status: string; messages: unknown[]; message: { at: string; kind: "CUSTOMER"; text: string; evidenceRequest: false } };

export function decideCustomerReply(doc: Doc | undefined, uid: string, body: string, at: string): ReplyDecision {
  if (!doc || doc.customerId !== uid) return { code: 404 };
  const status = typeof doc.status === "string" ? doc.status : "OPEN";
  if (!canCustomerReply(status)) return { code: 409, reason: "closed" };
  const stored = Array.isArray(doc.messages) ? doc.messages : [];
  if (stored.length >= MAX_MESSAGES) return { code: 409, reason: "full" };
  return {
    code: 200,
    status: statusAfterCustomerReply(status),
    messages: [...stored, { at, actor: "Customer", kind: "CUSTOMER", text: body }],
    message: { at, kind: "CUSTOMER", text: body, evidenceRequest: false },
  };
}
