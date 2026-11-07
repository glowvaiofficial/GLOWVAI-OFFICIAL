// GlowVai coins ledger rules. Pure functions, plus the read-then-write helpers used inside transactions.
//
// What this file enforces:
//  - Entries are append-only: an entry is created once and there is no function here that updates or deletes one.
//  - The wallet balance is a cache of the ledger, written in the same transaction as the entry it reflects.
//  - A balance never goes negative: a debit larger than the balance is refused.
//  - Every entry has an idempotency key. The entry id is derived from the key, so a retried credit or debit that already
//    happened is found (duplicate) and not applied twice.
import { createHash } from "node:crypto";
import { GROWTH_CONFIG } from "../growth-config";
import type { GrowthRef, GrowthTx } from "./repo";

export type LedgerType = "CREDIT" | "DEBIT" | "EXPIRY";
export type LedgerSource = "REFERRAL_REFERRER" | "REFERRAL_REFEREE" | "ADMIN_ADJUSTMENT" | "CHECKOUT_REDEMPTION" | "ORDER_CANCELLED" | "EXPIRY" | "TOPUP" | "GIFT_CARD";

export interface LedgerInput {
  type: LedgerType;
  source: LedgerSource;
  // Positive whole coins. The sign comes from the type.
  amount: number;
  idempotencyKey: string;
  reason: string;
  orderId?: string | null;
  actor: string;
}

export type LedgerRefusal = "INVALID_AMOUNT" | "NEGATIVE_BALANCE" | "INVALID_KEY" | "INVALID_REASON" | "INVALID_TYPE";

const TYPES: readonly LedgerType[] = ["CREDIT", "DEBIT", "EXPIRY"];

export function ledgerEntryId(idempotencyKey: string): string {
  return createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 40);
}

export function validateLedgerInput(input: LedgerInput): LedgerRefusal | null {
  if (!TYPES.includes(input.type)) return "INVALID_TYPE";
  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > 1_000_000) return "INVALID_AMOUNT";
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.length === 0 || input.idempotencyKey.length > 200) return "INVALID_KEY";
  // A manual adjustment must say why, so the customer's history and the audit trail make sense.
  if (input.source === "ADMIN_ADJUSTMENT" && input.reason.trim().length < 5) return "INVALID_REASON";
  return null;
}

// The balance after an entry, or the refusal. Credits add; debits and expiries subtract and must not overdraw.
export function balanceAfter(current: number, input: LedgerInput): { ok: true; balance: number } | { ok: false; refusal: LedgerRefusal } {
  const refusal = validateLedgerInput(input);
  if (refusal) return { ok: false, refusal };
  if (input.type === "CREDIT") return { ok: true, balance: current + input.amount };
  if (input.amount > current) return { ok: false, refusal: "NEGATIVE_BALANCE" };
  return { ok: true, balance: current - input.amount };
}

// Sum of ledger entries, signed. Used to check that the cached wallet balance matches the ledger.
export function ledgerSum(entries: Array<{ type: LedgerType; amount: number }>): number {
  return entries.reduce((sum, e) => sum + (e.type === "CREDIT" ? e.amount : -e.amount), 0);
}

// Expiry for a credit made at `now`, or null while coins never expire (the default).
export function expiresAt(now: number): number | null {
  const days = GROWTH_CONFIG.coins.expiryDays;
  return days === null ? null : now + days * 86_400_000;
}

export const walletPath = (uid: string): string => `wallets/${uid}`;
export const ledgerPath = (uid: string, entryId: string): string => `wallets/${uid}/ledger/${entryId}`;

export function numberOr0(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export interface LedgerPlan {
  uid: string;
  walletRef: GrowthRef;
  entryRef: GrowthRef;
  duplicate: boolean;
  // The balance before this entry, and after it.
  before: number;
  balance: number;
  entry: Record<string, unknown> | null;
}

export type PlanResult = { ok: true; plan: LedgerPlan } | { ok: false; refusal: LedgerRefusal };

// Reads the wallet and the entry for this idempotency key. Call only before any write in the transaction.
export async function planLedgerEntry(tx: GrowthTx, ref: (path: string) => GrowthRef, uid: string, input: LedgerInput): Promise<PlanResult> {
  const refusal = validateLedgerInput(input);
  if (refusal) return { ok: false, refusal };
  const id = ledgerEntryId(input.idempotencyKey);
  const walletRef = ref(walletPath(uid));
  const entryRef = ref(ledgerPath(uid, id));
  const wallet = await tx.get(walletRef);
  const existing = await tx.get(entryRef);
  const current = numberOr0(wallet.exists ? wallet.data()?.balance : 0);
  if (existing.exists) return { ok: true, plan: { uid, walletRef, entryRef, duplicate: true, before: current, balance: current, entry: null } };
  const next = balanceAfter(current, input);
  if (!next.ok) return { ok: false, refusal: next.refusal };
  return {
    ok: true,
    plan: {
      uid,
      walletRef,
      entryRef,
      duplicate: false,
      before: current,
      balance: next.balance,
      entry: {
        id,
        uid,
        type: input.type,
        source: input.source,
        amount: input.amount,
        signed: input.type === "CREDIT" ? input.amount : -input.amount,
        balanceAfter: next.balance,
        reason: input.reason.trim().slice(0, 200),
        orderId: input.orderId ?? null,
        idempotencyKey: input.idempotencyKey,
        actor: input.actor.slice(0, 80),
        expiresAt: null,
      },
    },
  };
}

// Writes the entry (create only) and the new cached balance. Call only after every read in the transaction is done.
export function writeLedgerPlan(tx: GrowthTx, plan: LedgerPlan, now: number): void {
  if (plan.duplicate || !plan.entry) return;
  const credit = plan.entry.type === "CREDIT";
  tx.create(plan.entryRef, { ...plan.entry, createdAt: now, expiresAt: credit ? expiresAt(now) : null });
  tx.set(plan.walletRef, { uid: plan.uid, balance: plan.balance, updatedAt: now }, { merge: true });
}
