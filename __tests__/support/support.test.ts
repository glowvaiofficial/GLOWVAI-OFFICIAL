import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MESSAGES,
  REPLY_MAX_LENGTH,
  createWindowLimiter,
  customerTicket,
  decideCustomerReply,
  validateCustomerReply,
} from "../../lib/shop/support";

const NOW = "2026-11-06T10:00:00.000Z";

// A request as the admin panel stores it, with every internal field filled in.
const stored = (over: Record<string, unknown> = {}) => ({
  id: "TKT-APP-1A2B",
  customerId: "uid-customer-1",
  orderId: "GV-10231",
  category: "ORDER_DELAY",
  status: "IN_PROGRESS",
  priority: "URGENT",
  channel: "APP",
  subject: "Late parcel",
  description: "Still not here",
  amount: 499,
  resolution: null,
  createdAt: "2026-11-06T09:00:00.000Z",
  dueAt: "2026-11-06T11:00:00.000Z",
  assignee: "Ananya Rao",
  escalated: true,
  internalNotes: [{ at: NOW, actor: "Ravi Kumar", text: "INTERNAL-SECRET suspect batch 77" }],
  history: [{ at: NOW, actor: "Ravi Kumar", event: "Escalated: INTERNAL-HISTORY" }],
  linkedRefundOrReturn: "GV-10231",
  requestedBy: "Ravi Kumar",
  reopenCount: 2,
  messages: [
    { at: "2026-11-06T09:30:00.000Z", actor: "Ananya Rao", kind: "STAFF", text: "We are checking with the courier." },
    { at: "2026-11-06T09:40:00.000Z", actor: "Customer", kind: "CUSTOMER", text: "Any update?" },
    { at: "2026-11-06T09:45:00.000Z", actor: "Ananya Rao", kind: "EVIDENCE_REQUEST", text: "Send a photo of the label." },
    { at: "2026-11-06T09:50:00.000Z", actor: "Ravi Kumar", kind: "INTERNAL", text: "INTERNAL-MESSAGE do not show" },
  ],
  ...over,
});

describe("customer projection", () => {
  test("no internal field reaches the customer", () => {
    const json = JSON.stringify(customerTicket(stored()));
    for (const secret of ["INTERNAL-SECRET", "INTERNAL-HISTORY", "INTERNAL-MESSAGE", "Ravi Kumar", "Ananya Rao", "Escalated"]) {
      assert.ok(!json.includes(secret), `${secret} must not be in the customer view`);
    }
    const view = customerTicket(stored()) as unknown as Record<string, unknown>;
    for (const key of ["internalNotes", "history", "assignee", "priority", "escalated", "dueAt", "amount", "channel", "requestedBy", "reopenCount", "linkedRefundOrReturn"]) {
      assert.ok(!(key in view), `${key} must not be in the customer view`);
    }
  });

  test("the fields the shop already reads are kept", () => {
    const view = customerTicket(stored());
    assert.deepEqual(Object.keys(view).sort(), ["category", "createdAt", "id", "messages", "orderId", "resolution", "status", "subject"]);
    assert.equal(view.id, "TKT-APP-1A2B");
    assert.equal(view.orderId, "GV-10231");
    assert.equal(view.status, "IN_PROGRESS");
  });

  test("messages: staff kinds read as STAFF, customer messages as CUSTOMER, anything else is dropped", () => {
    const view = customerTicket(stored());
    assert.deepEqual(
      view.messages.map((m) => [m.kind, m.evidenceRequest, m.text]),
      [
        ["STAFF", false, "We are checking with the courier."],
        ["CUSTOMER", false, "Any update?"],
        ["STAFF", true, "Send a photo of the label."],
      ],
    );
  });

  test("timestamps from Firestore become ISO text, and messages are oldest first", () => {
    const ts = { toDate: () => new Date("2026-11-06T12:00:00.000Z") };
    const view = customerTicket(
      stored({
        createdAt: ts,
        messages: [
          { at: ts, kind: "STAFF", text: "Late one" },
          { at: "2026-11-06T08:00:00.000Z", kind: "STAFF", text: "Early one" },
        ],
      }),
    );
    assert.equal(view.createdAt, "2026-11-06T12:00:00.000Z");
    assert.deepEqual(
      view.messages.map((m) => m.text),
      ["Early one", "Late one"],
    );
  });

  test("a request with no messages or resolution still projects cleanly", () => {
    const view = customerTicket({ id: "TKT-APP-9", subject: "Help", status: "OPEN" });
    assert.deepEqual(view.messages, []);
    assert.equal(view.resolution, null);
    assert.equal(view.orderId, null);
  });
});

describe("reply ownership and status", () => {
  test("the owner can reply to an open request, and the request is updated", () => {
    const d = decideCustomerReply(stored({ status: "OPEN" }), "uid-customer-1", "Still waiting", NOW);
    assert.equal(d.code, 200);
    if (d.code !== 200) return;
    assert.deepEqual(d.message, { at: NOW, kind: "CUSTOMER", text: "Still waiting", evidenceRequest: false });
    assert.equal(d.status, "OPEN");
    assert.equal((d.messages[d.messages.length - 1] as { kind: string }).kind, "CUSTOMER");
    assert.equal(d.messages.length, 5, "the stored messages are kept and the reply is added");
  });

  test("a reply to a request waiting for the customer hands it back to the team", () => {
    const d = decideCustomerReply(stored({ status: "WAITING_CUSTOMER" }), "uid-customer-1", "Here is the photo", NOW);
    assert.equal(d.code, 200);
    if (d.code === 200) assert.equal(d.status, "IN_PROGRESS");
  });

  test("another customer gets the same answer as a missing request", () => {
    assert.deepEqual(decideCustomerReply(stored(), "uid-someone-else", "Hi", NOW), { code: 404 });
    assert.deepEqual(decideCustomerReply(undefined, "uid-customer-1", "Hi", NOW), { code: 404 });
  });

  test("resolved and closed requests take no replies", () => {
    assert.deepEqual(decideCustomerReply(stored({ status: "RESOLVED" }), "uid-customer-1", "Hi", NOW), { code: 409, reason: "closed" });
    assert.deepEqual(decideCustomerReply(stored({ status: "CLOSED" }), "uid-customer-1", "Hi", NOW), { code: 409, reason: "closed" });
  });

  test("a request at the message limit takes no more replies", () => {
    const full = Array.from({ length: MAX_MESSAGES }, (_, i) => ({ at: NOW, kind: "STAFF", text: `m${i}` }));
    assert.deepEqual(decideCustomerReply(stored({ messages: full }), "uid-customer-1", "Hi", NOW), { code: 409, reason: "full" });
  });
});

describe("reply text", () => {
  test("text is required and trimmed", () => {
    assert.deepEqual(validateCustomerReply("   "), { ok: false, error: "Write your reply first." });
    assert.deepEqual(validateCustomerReply(undefined), { ok: false, error: "Write your reply first." });
    assert.deepEqual(validateCustomerReply("  Thanks  "), { ok: true, text: "Thanks" });
  });

  test("up to 2000 characters, and longer text is refused rather than cut", () => {
    assert.equal(validateCustomerReply("a".repeat(REPLY_MAX_LENGTH)).ok, true);
    const long = validateCustomerReply("a".repeat(REPLY_MAX_LENGTH + 1));
    assert.equal(long.ok, false);
    if (!long.ok) assert.match(long.error, /up to 2000 characters/);
  });
});

describe("rate limit: 10 replies an hour per customer", () => {
  const HOUR = 60 * 60 * 1000;

  test("the eleventh reply in the hour is refused", () => {
    const limiter = createWindowLimiter(10, HOUR);
    for (let i = 0; i < 10; i++) assert.equal(limiter.allow("uid-a", 1000 + i), true);
    assert.equal(limiter.allow("uid-a", 2000), false);
  });

  test("another customer is not affected", () => {
    const limiter = createWindowLimiter(10, HOUR);
    for (let i = 0; i < 10; i++) limiter.allow("uid-a", 1000 + i);
    assert.equal(limiter.allow("uid-b", 2000), true);
  });

  test("replies are allowed again once the hour has passed", () => {
    const limiter = createWindowLimiter(10, HOUR);
    for (let i = 0; i < 10; i++) limiter.allow("uid-a", 1000 + i);
    assert.equal(limiter.allow("uid-a", 1000 + HOUR + 1), true);
  });
});
