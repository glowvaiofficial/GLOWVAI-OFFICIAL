// Subscribe and save: cadence maths, pause/resume/cancel rules, and the daily run that creates subscription orders.
//
// The daily run (runSubscriptionCycle) is safe to repeat:
//  - a run lock per day (subscriptionRuns/{YYYY-MM-DD}): a day that finished is never run again, and a run that is
//    still running (lock not expired) is not started a second time;
//  - each order id is derived from (subscription, day), so creating it twice is refused by the order transaction
//    itself, and the run treats that refusal as "already created";
//  - a subscription's next run only moves forward when its order (or skip) is recorded.
// The order itself is created by the same helper the checkout uses: the caller passes createOrder, which the shop
// wires to placeOrderCore (lib/shop/orderCore.ts). Tests pass a stub.
import { createHash } from "node:crypto";
import { GROWTH_CONFIG } from "../growth-config";
import type { GrowthRepo, GrowthSnap, GrowthTx } from "./repo";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED";

export interface SubscriptionInput {
  productId: string;
  quantity: number;
  intervalWeeks: number;
}

export function validateSubscriptionInput(input: Record<string, unknown>):
  | { ok: true; value: SubscriptionInput }
  | { ok: false; error: string } {
  const productId = typeof input.productId === "string" ? input.productId.trim().slice(0, 140) : "";
  if (!productId) return { ok: false, error: "Choose a product to subscribe to." };
  const quantity = Number(input.quantity);
  const { quantityMin, quantityMax, intervalsWeeks } = GROWTH_CONFIG.subscriptions;
  if (!Number.isInteger(quantity) || quantity < quantityMin || quantity > quantityMax) {
    return { ok: false, error: `Choose a quantity from ${quantityMin} to ${quantityMax}.` };
  }
  const intervalWeeks = Number(input.intervalWeeks);
  if (!intervalsWeeks.includes(intervalWeeks)) return { ok: false, error: "Choose a delivery every 2, 4 or 8 weeks." };
  return { ok: true, value: { productId, quantity, intervalWeeks } };
}

// The first delivery is one interval after the customer subscribes.
export function firstRunAt(now: number, intervalWeeks: number): number {
  return now + intervalWeeks * WEEK;
}

// The next run after one has been handled. The cadence stays fixed (prev + k * interval) even when the run was late,
// and the result is always after `now`, so a long outage never produces a burst of catch-up orders.
export function nextRunAfter(prev: number | null, intervalWeeks: number, now: number): number {
  const step = intervalWeeks * WEEK;
  if (prev === null || !Number.isFinite(prev)) return now + step;
  let candidate = prev + step;
  if (candidate <= now) {
    const behind = Math.floor((now - prev) / step) + 1;
    candidate = prev + behind * step;
  }
  return candidate;
}

// A skipped subscription is looked at again after the retry window (daily by default). It is pushed out of the due
// list until then, so skipped ones never crowd out the rest of the day's run.
export function retryAfterSkip(now: number): number {
  return now + GROWTH_CONFIG.subscriptions.skipRetryHours * 3_600_000;
}

// The calendar day of a run in India (IST), as YYYY-MM-DD. Runs are keyed on this day.
export function runDateKey(now: number): string {
  return new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

// Order id for one subscription on one day. Same format as checkout ids (GV-YYMMDD-XXXXXX), derived so that a repeat
// run for the same day produces the same id, which the order transaction refuses as a clash.
export function subscriptionOrderId(subscriptionId: string, runDate: string): string {
  const yymmdd = runDate.slice(2, 4) + runDate.slice(5, 7) + runDate.slice(8, 10);
  const hash = createHash("sha256").update(`${subscriptionId}|${runDate}`).digest("hex").slice(0, 6).toUpperCase();
  return `GV-${yymmdd}-${hash}`;
}

export type SubscriptionAction = "pause" | "resume" | "cancel" | "quantity";

export type TransitionResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; code: "NOT_ALLOWED" | "INVALID_QUANTITY"; message: string };

// The change a customer asks for, checked against the current state. Returns the fields to write, or the refusal.
export function transition(
  sub: { status?: unknown; intervalWeeks?: unknown },
  action: SubscriptionAction,
  now: number,
  options: { quantity?: unknown } = {},
): TransitionResult {
  const status = String(sub.status ?? "");
  const weeks = Number(sub.intervalWeeks);
  const refuse = (code: "NOT_ALLOWED" | "INVALID_QUANTITY", message: string): TransitionResult => ({ ok: false, code, message });
  if (action === "pause") {
    if (status !== "ACTIVE") return refuse("NOT_ALLOWED", "Only an active subscription can be paused.");
    return { ok: true, patch: { status: "PAUSED", nextRunAt: null, pausedAt: now } };
  }
  if (action === "resume") {
    if (status !== "PAUSED") return refuse("NOT_ALLOWED", "Only a paused subscription can be resumed.");
    return { ok: true, patch: { status: "ACTIVE", nextRunAt: firstRunAt(now, weeks), pausedAt: null } };
  }
  if (action === "cancel") {
    if (status !== "ACTIVE" && status !== "PAUSED") return refuse("NOT_ALLOWED", "This subscription has already ended.");
    return { ok: true, patch: { status: "CANCELLED", nextRunAt: null, cancelledAt: now } };
  }
  if (action === "quantity") {
    if (status !== "ACTIVE" && status !== "PAUSED") return refuse("NOT_ALLOWED", "This subscription has already ended.");
    const q = Number(options.quantity);
    const { quantityMin, quantityMax } = GROWTH_CONFIG.subscriptions;
    if (!Number.isInteger(q) || q < quantityMin || q > quantityMax) {
      return refuse("INVALID_QUANTITY", `Choose a quantity from ${quantityMin} to ${quantityMax}.`);
    }
    return { ok: true, patch: { quantity: q } };
  }
  return refuse("NOT_ALLOWED", "That change is not available.");
}

// Outcome of creating one subscription order. "DUPLICATE" means the order for this day already exists.
export type CycleOutcome = { ok: true; orderId: string } | { ok: false; code: string };

export interface CycleSummary {
  status: "RAN" | "ALREADY_RAN" | "BUSY";
  runDate: string;
  processed: number;
  created: number;
  skipped: Record<string, number>;
}

export interface CycleOptions {
  repo: GrowthRepo;
  now: number;
  runId: string;
  createOrder: (sub: { id: string; uid: string; productId: string; quantity: number; address: unknown }, orderId: string) => Promise<CycleOutcome>;
}

export const runPath = (runDate: string) => `subscriptionRuns/${runDate}`;
export const runItemPath = (runDate: string, subscriptionId: string) => `subscriptionRuns/${runDate}/items/${subscriptionId}`;

export async function runSubscriptionCycle(opts: CycleOptions): Promise<CycleSummary> {
  const { repo, now } = opts;
  const runDate = runDateKey(now);
  const lockMs = GROWTH_CONFIG.subscriptions.runLockMinutes * 60_000;

  const lock = await repo.runTx(async (tx): Promise<"LOCKED" | "ALREADY_RAN" | "BUSY"> => {
    const ref = repo.ref(runPath(runDate));
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    if (data.status === "DONE") return "ALREADY_RAN";
    if (data.status === "RUNNING" && Number(data.lockedUntil) > now) return "BUSY";
    tx.set(ref, { runDate, status: "RUNNING", runId: opts.runId, startedAt: now, lockedUntil: now + lockMs }, { merge: true });
    return "LOCKED";
  });
  if (lock !== "LOCKED") return { status: lock === "ALREADY_RAN" ? "ALREADY_RAN" : "BUSY", runDate, processed: 0, created: 0, skipped: {} };

  const due = await repo.query("subscriptions", [["nextRunAt", "<=", now]], { limit: GROWTH_CONFIG.subscriptions.maxPerRun });
  const skipped: Record<string, number> = {};
  let created = 0;
  let processed = 0;
  for (const snap of due) {
    processed++;
    const outcome = await handleOne(opts, snap, runDate, now);
    if (outcome.kind === "created") created++;
    if (outcome.kind === "skipped") skipped[outcome.reason] = (skipped[outcome.reason] ?? 0) + 1;
  }

  await repo.runTx(async (tx) => {
    tx.set(
      repo.ref(runPath(runDate)),
      { status: "DONE", runId: opts.runId, finishedAt: now, lockedUntil: null, processed, created, skipped },
      { merge: true },
    );
  });
  return { status: "RAN", runDate, processed, created, skipped };
}

type HandleResult = { kind: "created" } | { kind: "skipped"; reason: string } | { kind: "already" };

async function handleOne(opts: CycleOptions, snap: GrowthSnap, runDate: string, now: number): Promise<HandleResult> {
  const { repo } = opts;
  const data = snap.data() ?? {};
  const id = snap.id;
  if (data.status !== "ACTIVE") return { kind: "skipped", reason: "NOT_ACTIVE" };
  const done = await repo.get(repo.ref(runItemPath(runDate, id)));
  if (done.exists) return { kind: "already" };

  const orderId = subscriptionOrderId(id, runDate);
  let outcome: CycleOutcome;
  try {
    outcome = await opts.createOrder({ id, uid: String(data.uid ?? ""), productId: String(data.productId ?? ""), quantity: Number(data.quantity), address: data.address }, orderId);
  } catch {
    outcome = { ok: false, code: "ERROR" };
  }
  if (!outcome.ok && outcome.code === "DUPLICATE") outcome = { ok: true, orderId };

  const reason = outcome.ok ? null : outcome.code;
  const weeks = Number(data.intervalWeeks);
  return repo.runTx(async (tx: GrowthTx): Promise<HandleResult> => {
    const item = await tx.get(repo.ref(runItemPath(runDate, id)));
    if (item.exists) return { kind: "already" };
    const subRef = repo.ref(`subscriptions/${id}`);
    const current = await tx.get(subRef);
    if (!current.exists) return { kind: "skipped", reason: "NOT_FOUND" };
    if (outcome.ok) {
      tx.set(repo.ref(runItemPath(runDate, id)), { subscriptionId: id, runDate, status: "CREATED", orderId, at: now });
      tx.set(
        subRef,
        { nextRunAt: nextRunAfter(Number(data.nextRunAt), weeks, now), lastOrderId: orderId, lastRunAt: now, lastSkipReason: null, updatedAt: now },
        { merge: true },
      );
      return { kind: "created" };
    }
    tx.set(repo.ref(runItemPath(runDate, id)), { subscriptionId: id, runDate, status: "SKIPPED", reason, at: now });
    tx.set(subRef, { nextRunAt: retryAfterSkip(now), lastSkipReason: reason, lastSkippedAt: now, updatedAt: now }, { merge: true });
    return { kind: "skipped", reason: reason ?? "ERROR" };
  });
}
