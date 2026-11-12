// GlowVai Coins top-ups and wallet reads. Every balance change goes through the growth ledger (lib/shop/growth/ledger.ts):
// one entry per idempotency key, a non-negative balance, and the balance written in the same transaction as the entry.
// Stores are passed in (GrowthRepo), so the node tests run these against the in-memory repo and the routes use Firestore.
//
// Rules that matter most:
//  - Coins are credited only after a captured payment whose amount equals the top-up's amount. The credit key is
//    `topup:{topupId}`, so the verify call and the webhook can both run; the second one changes nothing.
//  - FAILED and EXPIRED are not final. A capture that arrives later (a retry, or a slow webhook) still credits, because the
//    customer has paid. PAID is the only final state.
//  - A captured payment that cannot be credited yet (amount mismatch, or the balance cap) is HELD with a reason. A later
//    capture re-checks the hold. The reconciliation lists every held top-up.
import { randomBytes } from "node:crypto";
import { GROWTH_CONFIG } from "../growth-config";
import { ledgerEntryId, ledgerPath, numberOr0, planLedgerEntry, walletPath, writeLedgerPlan, type LedgerInput } from "../growth/ledger";
import type { GrowthRepo, GrowthTx } from "../growth/repo";
import {
  COINS_PER_RUPEE,
  DAILY_TOPUP_CAP_RUPEES,
  MAX_BALANCE_COINS,
  MAX_TOPUP_RUPEES,
  MIN_TOPUP_RUPEES,
  TOPUP_EXPIRY_MINUTES,
  TOPUP_PRESETS_RUPEES,
  WALLET_PAGE_SIZE,
} from "../wallet-config";
import {
  coinsForRupees,
  countsAgainstCap,
  dailyCapRemaining,
  effectiveTopupStatus,
  exceedsBalanceCap,
  exceedsDailyCap,
  istDayKey,
  paiseForRupees,
  parseTopupRupees,
  projectLedgerEntry,
  rateLine,
  WALLET_NOTICE,
  type HistoryRow,
  type TopupHold,
  type TopupStatus,
} from "./rules";

export const topupPath = (id: string): string => `walletTopups/${id}`;

export interface TopupRecord {
  id: string;
  uid: string;
  status: TopupStatus;
  amountRupees: number;
  amountPaise: number;
  coins: number;
  dayKey: string;
  razorpayOrderId: string | null;
  paymentId: string | null;
  createdAt: number;
  updatedAt: number;
  paidAt: number | null;
  failedAt: number | null;
  failureReason: string | null;
  balanceAfter: number | null;
  hold: TopupHold;
  holdPaymentId: string | null;
  holdPaidPaise: number | null;
}

// Reads a stored record into the typed shape. Missing fields become safe defaults.
export function readTopup(id: string, d: Record<string, unknown>): TopupRecord {
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const status: TopupStatus = d.status === "PAID" || d.status === "FAILED" || d.status === "EXPIRED" ? d.status : "CREATED";
  const hold = d.hold === "AMOUNT_MISMATCH" || d.hold === "BALANCE_CAP" ? d.hold : null;
  return {
    id,
    uid: String(d.uid ?? ""),
    status,
    amountRupees: numberOr0(d.amountRupees),
    amountPaise: numberOr0(d.amountPaise),
    coins: numberOr0(d.coins),
    dayKey: String(d.dayKey ?? ""),
    razorpayOrderId: str(d.razorpayOrderId),
    paymentId: str(d.paymentId),
    createdAt: numberOr0(d.createdAt),
    updatedAt: numberOr0(d.updatedAt),
    paidAt: num(d.paidAt),
    failedAt: num(d.failedAt),
    failureReason: str(d.failureReason),
    balanceAfter: num(d.balanceAfter),
    hold,
    holdPaymentId: str(d.holdPaymentId),
    holdPaidPaise: num(d.holdPaidPaise),
  };
}

export interface OrderFacts {
  id: string;
  amount: number;
  currency: string;
}

export interface TopupDeps {
  repo: GrowthRepo;
  now: number;
  keyId: string;
  // Creates the Razorpay order (live: createRazorpayOrder; tests: a stub). Receives notes holding the top-up id only.
  createOrder: (rupees: number, receipt: string, notes: Record<string, string>) => Promise<OrderFacts>;
}

export type Refusal = { ok: false; status: number; code: string; error: string };

// The customer's top-ups today that count against the daily cap. Read outside the transaction.
async function usedTodayRupees(repo: GrowthRepo, uid: string, now: number): Promise<number> {
  const rows = await repo.query("walletTopups", [
    ["uid", "==", uid],
    ["dayKey", "==", istDayKey(now)],
  ], { limit: 200 });
  return rows.reduce((sum, snap) => {
    const rec = readTopup(snap.id, snap.data() ?? {});
    return countsAgainstCap(rec, now) ? sum + rec.amountRupees : sum;
  }, 0);
}

export type CreateResult =
  | { ok: true; topupId: string; rupees: number; coins: number; payment: { provider: "razorpay"; keyId: string; razorpayOrderId: string; amount: number; currency: string } }
  | Refusal;

// Step 1 of a top-up: check the bounds, the daily cap and the balance cap, record the top-up as CREATED, then open the
// Razorpay order. The browser receives the order id and the key id only. The amount and coins are computed here.
export async function createTopup(deps: TopupDeps, input: { uid: string; amount: unknown }): Promise<CreateResult> {
  const parsed = parseTopupRupees(input.amount);
  if (!parsed.ok) return { ok: false, status: 400, code: parsed.code, error: parsed.error };
  const rupees = parsed.rupees;
  const coins = coinsForRupees(rupees);
  const used = await usedTodayRupees(deps.repo, input.uid, deps.now);
  if (exceedsDailyCap(used, rupees)) {
    return {
      ok: false,
      status: 409,
      code: "DAILY_CAP",
      error: `You can add up to ₹${DAILY_TOPUP_CAP_RUPEES.toLocaleString("en-IN")} of Glow Coins a day. You can still add ₹${dailyCapRemaining(used).toLocaleString("en-IN")} today.`,
    };
  }
  const wallet = await deps.repo.get(deps.repo.ref(walletPath(input.uid)));
  if (exceedsBalanceCap(numberOr0(wallet.data()?.balance), coins)) {
    return { ok: false, status: 409, code: "BALANCE_CAP", error: `Your wallet can hold up to ${MAX_BALANCE_COINS.toLocaleString("en-IN")} Glow Coins. Choose a smaller amount.` };
  }
  const topupId = randomBytes(12).toString("hex");
  const record: TopupRecord = {
    id: topupId,
    uid: input.uid,
    status: "CREATED",
    amountRupees: rupees,
    amountPaise: paiseForRupees(rupees),
    coins,
    dayKey: istDayKey(deps.now),
    razorpayOrderId: null,
    paymentId: null,
    createdAt: deps.now,
    updatedAt: deps.now,
    paidAt: null,
    failedAt: null,
    failureReason: null,
    balanceAfter: null,
    hold: null,
    holdPaymentId: null,
    holdPaidPaise: null,
  };
  await deps.repo.runTx(async (tx) => {
    tx.create(deps.repo.ref(topupPath(topupId)), { ...record });
  });
  let order: OrderFacts;
  try {
    order = await deps.createOrder(rupees, `topup:${topupId}`, { topupId });
  } catch {
    // No payment was started, so the top-up is FAILED rather than left open.
    await markFailed(deps, { topupId, reason: "ORDER_NOT_CREATED", paymentId: null, expectUid: input.uid });
    return { ok: false, status: 502, code: "ORDER_NOT_CREATED", error: "We could not start the payment. Please try again in a moment." };
  }
  if (order.amount !== record.amountPaise || order.currency !== "INR") {
    await markFailed(deps, { topupId, reason: "ORDER_MISMATCH", paymentId: null, expectUid: input.uid });
    return { ok: false, status: 502, code: "ORDER_MISMATCH", error: "We could not start the payment. Please try again in a moment." };
  }
  await deps.repo.runTx(async (tx) => {
    const snap = await tx.get(deps.repo.ref(topupPath(topupId)));
    if (!snap.exists) return;
    tx.update(deps.repo.ref(topupPath(topupId)), { razorpayOrderId: order.id, updatedAt: deps.now });
  });
  return {
    ok: true,
    topupId,
    rupees,
    coins,
    payment: { provider: "razorpay", keyId: deps.keyId, razorpayOrderId: order.id, amount: order.amount, currency: order.currency },
  };
}

export type CreditResult =
  | { ok: true; status: "PAID"; topupId: string; coins: number; balance: number; duplicate: boolean }
  | { ok: false; code: "NOT_FOUND" | "ORDER_MISMATCH" | "AMOUNT_MISMATCH" | "BALANCE_CAP" | "NOT_CAPTURED" };

// Credits a top-up once, for a captured payment. Used by the verify route and the webhook. Reads everything first, then
// writes the ledger entry, the wallet balance and the top-up status in the same transaction.
export async function creditTopup(
  deps: { repo: GrowthRepo; now: number },
  input: { topupId: string; expectUid: string | null; paymentId: string; orderId: string; paidPaise: number; currency: string },
): Promise<CreditResult> {
  const { repo, now } = deps;
  return repo.runTx(async (tx: GrowthTx): Promise<CreditResult> => {
    const ref = repo.ref(topupPath(input.topupId));
    const snap = await tx.get(ref);
    if (!snap.exists || !snap.data()) return { ok: false, code: "NOT_FOUND" };
    const rec = readTopup(input.topupId, snap.data() ?? {});
    if (input.expectUid !== null && rec.uid !== input.expectUid) return { ok: false, code: "NOT_FOUND" };
    if (rec.status === "PAID") {
      return { ok: true, status: "PAID", topupId: rec.id, coins: rec.coins, balance: numberOr0(rec.balanceAfter), duplicate: true };
    }
    if (rec.razorpayOrderId !== null && rec.razorpayOrderId !== input.orderId) return { ok: false, code: "ORDER_MISMATCH" };
    if (input.currency !== "INR" || input.paidPaise !== rec.amountPaise) {
      tx.update(ref, { hold: "AMOUNT_MISMATCH", holdPaymentId: input.paymentId, holdPaidPaise: input.paidPaise, updatedAt: now });
      return { ok: false, code: "AMOUNT_MISMATCH" };
    }
    const ledgerInput: LedgerInput = {
      type: "CREDIT",
      source: "TOPUP",
      amount: rec.coins,
      idempotencyKey: `topup:${rec.id}`,
      reason: `Wallet top-up of ₹${rec.amountRupees}`,
      orderId: null,
      actor: "customer",
    };
    const planned = await planLedgerEntry(tx, (p) => repo.ref(p), rec.uid, ledgerInput);
    if (!planned.ok) return { ok: false, code: "NOT_CAPTURED" };
    const plan = planned.plan;
    if (!plan.duplicate && exceedsBalanceCap(plan.before, rec.coins)) {
      tx.update(ref, { hold: "BALANCE_CAP", holdPaymentId: input.paymentId, holdPaidPaise: input.paidPaise, updatedAt: now });
      return { ok: false, code: "BALANCE_CAP" };
    }
    writeLedgerPlan(tx, plan, now);
    tx.update(ref, {
      status: "PAID",
      paymentId: input.paymentId,
      paidAt: now,
      failedAt: null,
      failureReason: null,
      balanceAfter: plan.balance,
      hold: null,
      holdPaymentId: null,
      holdPaidPaise: null,
      updatedAt: now,
    });
    return { ok: true, status: "PAID", topupId: rec.id, coins: rec.coins, balance: plan.balance, duplicate: plan.duplicate };
  });
}

// Marks a top-up FAILED. Never credits. A PAID top-up is left alone.
export async function markFailed(
  deps: { repo: GrowthRepo; now: number },
  input: { topupId: string; reason: string; paymentId: string | null; expectUid: string | null },
): Promise<{ ok: true; status: TopupStatus } | { ok: false; code: "NOT_FOUND" }> {
  const { repo, now } = deps;
  return repo.runTx(async (tx) => {
    const ref = repo.ref(topupPath(input.topupId));
    const snap = await tx.get(ref);
    if (!snap.exists || !snap.data()) return { ok: false as const, code: "NOT_FOUND" as const };
    const rec = readTopup(input.topupId, snap.data() ?? {});
    if (input.expectUid !== null && rec.uid !== input.expectUid) return { ok: false as const, code: "NOT_FOUND" as const };
    if (rec.status === "PAID") return { ok: true as const, status: "PAID" as const };
    tx.update(ref, {
      status: "FAILED",
      failedAt: now,
      failureReason: input.reason.slice(0, 60),
      paymentId: input.paymentId ?? rec.paymentId,
      updatedAt: now,
    });
    return { ok: true as const, status: "FAILED" as const };
  });
}

// Status for the customer. A CREATED top-up older than the expiry window is written as EXPIRED (read-time check).
export async function topupStatus(
  deps: { repo: GrowthRepo; now: number },
  input: { topupId: string; uid: string },
): Promise<{ ok: true; topupId: string; status: TopupStatus; hold: TopupHold; amountRupees: number; coins: number } | { ok: false; code: "NOT_FOUND" }> {
  const { repo, now } = deps;
  return repo.runTx(async (tx) => {
    const ref = repo.ref(topupPath(input.topupId));
    const snap = await tx.get(ref);
    if (!snap.exists || !snap.data()) return { ok: false as const, code: "NOT_FOUND" as const };
    const rec = readTopup(input.topupId, snap.data() ?? {});
    if (rec.uid !== input.uid) return { ok: false as const, code: "NOT_FOUND" as const };
    const status = effectiveTopupStatus(rec.status, rec.createdAt, now);
    if (status !== rec.status) tx.update(ref, { status, updatedAt: now });
    return { ok: true as const, topupId: rec.id, status, hold: rec.hold, amountRupees: rec.amountRupees, coins: rec.coins };
  });
}

// The wallet screen's summary: balance, the rate and the limits, all from config.
export async function walletSummary(deps: { repo: GrowthRepo; now: number }, uid: string) {
  const wallet = await deps.repo.get(deps.repo.ref(walletPath(uid)));
  const balance = numberOr0(wallet.data()?.balance);
  const used = await usedTodayRupees(deps.repo, uid, deps.now);
  return {
    balance,
    rupeesValue: Math.floor(balance / COINS_PER_RUPEE),
    rate: { coinsPerRupee: COINS_PER_RUPEE, line: rateLine() },
    notice: WALLET_NOTICE,
    limits: {
      minRupees: MIN_TOPUP_RUPEES,
      maxRupees: MAX_TOPUP_RUPEES,
      presetsRupees: [...TOPUP_PRESETS_RUPEES],
      maxBalanceCoins: MAX_BALANCE_COINS,
      dailyCapRupees: DAILY_TOPUP_CAP_RUPEES,
      dailyCapUsedRupees: used,
      dailyCapRemainingRupees: dailyCapRemaining(used),
      expiryMinutes: TOPUP_EXPIRY_MINUTES,
    },
    checkoutRupeesPerCoin: GROWTH_CONFIG.coins.rupeesPerCoin,
  };
}

// One page of the ledger, newest first. The cursor is "{createdAt}" or "{createdAt}.{ids}": the createdAt of the last row
// shown, plus the ids of rows already shown at that same millisecond (usually none). The next page takes rows at or before
// that time, leaves out those ids, and so never repeats or skips a row.
const CURSOR_PATTERN = /^([0-9]{1,15})(?:[.]([a-f0-9]{40}(?:,[a-f0-9]{40}){0,49}))?$/;

export async function walletHistory(
  deps: { repo: GrowthRepo },
  input: { uid: string; cursor: string | null },
): Promise<{ ok: true; rows: HistoryRow[]; nextCursor: string | null } | { ok: false; code: "BAD_CURSOR" }> {
  let ts: number | null = null;
  let shown = new Set<string>();
  if (input.cursor !== null) {
    const m = CURSOR_PATTERN.exec(input.cursor);
    if (!m) return { ok: false, code: "BAD_CURSOR" };
    ts = Number(m[1]);
    if (m[2]) shown = new Set(m[2].split(","));
  }
  const filters: Array<[string, "<=", number]> = ts === null ? [] : [["createdAt", "<=", ts]];
  const snaps = await deps.repo.query(`wallets/${input.uid}/ledger`, filters, {
    limit: WALLET_PAGE_SIZE + 1 + shown.size,
    orderByDesc: "createdAt",
  });
  const rows = snaps
    .map((s) => projectLedgerEntry(s.id, s.data() ?? {}))
    .filter((r) => !(r.createdAt === ts && shown.has(r.id)));
  const page = rows.slice(0, WALLET_PAGE_SIZE);
  if (rows.length <= WALLET_PAGE_SIZE) return { ok: true, rows: page, nextCursor: null };
  const last = page[page.length - 1].createdAt;
  const ids = new Set<string>(last === ts ? shown : []);
  for (const r of page) if (r.createdAt === last) ids.add(r.id);
  return { ok: true, rows: page, nextCursor: `${last}.${[...ids].slice(0, 50).join(",")}` };
}

// Gift card hook: credits a card's coins once, with source GIFT_CARD and key giftcard:{cardId}.
export async function creditGiftCardCoins(
  deps: { repo: GrowthRepo; now: number },
  input: { uid: string; cardId: string; coins: number },
): Promise<{ ok: true; applied: boolean; balance: number } | { ok: false; code: "INVALID_CARD" | "INVALID_AMOUNT" | "BALANCE_CAP" }> {
  if (!/^[A-Za-z0-9_-]{4,120}$/.test(input.cardId)) return { ok: false, code: "INVALID_CARD" };
  if (!Number.isInteger(input.coins) || input.coins <= 0) return { ok: false, code: "INVALID_AMOUNT" };
  const ledgerInput: LedgerInput = {
    type: "CREDIT",
    source: "GIFT_CARD",
    amount: input.coins,
    idempotencyKey: `giftcard:${input.cardId}`,
    reason: "Gift card credit",
    orderId: null,
    actor: "gift cards",
  };
  return deps.repo.runTx(async (tx) => {
    const planned = await planLedgerEntry(tx, (p) => deps.repo.ref(p), input.uid, ledgerInput);
    if (!planned.ok) return { ok: false as const, code: "INVALID_AMOUNT" as const };
    if (!planned.plan.duplicate && exceedsBalanceCap(planned.plan.before, input.coins)) return { ok: false as const, code: "BALANCE_CAP" as const };
    writeLedgerPlan(tx, planned.plan, deps.now);
    return { ok: true as const, applied: !planned.plan.duplicate, balance: planned.plan.balance };
  });
}

// Read model for the team. A top-up counts as PAID money when its status is PAID or it is HELD (a captured payment that
// could not be credited). Each paid top-up must have its ledger entry at wallets/{uid}/ledger/{ledgerEntryId(topup:{id})}
// with the same coins. Anything else is listed in `differences`.
export interface TopupAdminRow {
  topupId: string;
  customer: string;
  status: TopupStatus;
  hold: TopupHold;
  amountRupees: number;
  coins: number;
  createdAt: number;
  paidAt: number | null;
  paymentId: string | null;
}

export interface TopupFilters {
  status?: TopupStatus;
  uid?: string;
  from?: number;
  to?: number;
  limit?: number;
}

export const maskUid = (uid: string): string => (uid.length <= 6 ? "******" : `${uid.slice(0, 4)}…${uid.slice(-2)}`);

export interface ReconciliationDifference {
  topupId: string;
  reason: "HELD" | "NO_LEDGER_ENTRY" | "LEDGER_MISMATCH";
  hold: TopupHold;
  paidCoins: number;
  ledgerCoins: number;
}

export async function listTopups(
  deps: { repo: GrowthRepo },
  filters: TopupFilters,
): Promise<{
  rows: TopupAdminRow[];
  totals: { paidCount: number; paidRupees: number; paidCoins: number; ledgerCreditCoins: number; differenceCoins: number };
  differences: ReconciliationDifference[];
}> {
  const limit = Math.min(Math.max(1, filters.limit ?? 200), 500);
  const eq: Array<[string, "==", unknown]> = [];
  if (filters.uid) eq.push(["uid", "==", filters.uid]);
  if (filters.status) eq.push(["status", "==", filters.status]);
  const snaps = await deps.repo.query("walletTopups", eq, { limit: 500 });
  const recs = snaps
    .map((s) => readTopup(s.id, s.data() ?? {}))
    .filter((r) => (filters.from === undefined || r.createdAt >= filters.from) && (filters.to === undefined || r.createdAt <= filters.to))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);

  const totals = { paidCount: 0, paidRupees: 0, paidCoins: 0, ledgerCreditCoins: 0, differenceCoins: 0 };
  const differences: ReconciliationDifference[] = [];
  for (const r of recs) {
    const captured = r.status === "PAID" || r.hold !== null;
    if (!captured) continue;
    totals.paidCount++;
    totals.paidRupees += r.amountRupees;
    totals.paidCoins += r.coins;
    if (r.hold) {
      differences.push({ topupId: r.id, reason: "HELD", hold: r.hold, paidCoins: r.coins, ledgerCoins: 0 });
      continue;
    }
    const entry = await deps.repo.get(deps.repo.ref(ledgerPath(r.uid, ledgerEntryId(`topup:${r.id}`))));
    const d = entry.exists ? entry.data() ?? {} : {};
    const ledgerCoins = entry.exists && d.type === "CREDIT" && d.source === "TOPUP" ? numberOr0(d.amount) : 0;
    if (ledgerCoins === 0) differences.push({ topupId: r.id, reason: "NO_LEDGER_ENTRY", hold: null, paidCoins: r.coins, ledgerCoins: 0 });
    else if (ledgerCoins !== r.coins) differences.push({ topupId: r.id, reason: "LEDGER_MISMATCH", hold: null, paidCoins: r.coins, ledgerCoins });
    totals.ledgerCreditCoins += ledgerCoins;
  }
  totals.differenceCoins = totals.paidCoins - totals.ledgerCreditCoins;
  return {
    rows: recs.map((r) => ({
      topupId: r.id,
      customer: maskUid(r.uid),
      status: r.status,
      hold: r.hold,
      amountRupees: r.amountRupees,
      coins: r.coins,
      createdAt: r.createdAt,
      paidAt: r.paidAt,
      paymentId: r.paymentId,
    })),
    totals,
    differences,
  };
}
