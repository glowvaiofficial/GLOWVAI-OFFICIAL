// GlowVai coins at checkout: the cap maths, the redeem preview and applyCoins, which the order transaction calls.
// Pure maths first; applyCoins takes the transaction it is given and follows the read-before-write rule.
import { GROWTH_CONFIG } from "../growth-config";
import { planLedgerEntry, writeLedgerPlan, type LedgerInput } from "./ledger";
import type { GrowthRef, GrowthTx } from "./repo";

// The most coins that may pay for an order: a share of the item total, never more than the balance, never negative.
// Whole coins only (rounded down), so the discount is always a whole rupee.
export function maxRedeemable(input: { itemTotal: number; balance: number }): number {
  const itemTotal = Number.isFinite(input.itemTotal) ? Math.max(0, Math.floor(input.itemTotal)) : 0;
  const balance = Number.isFinite(input.balance) ? Math.max(0, Math.floor(input.balance)) : 0;
  const byShare = Math.floor((itemTotal * GROWTH_CONFIG.coins.maxRedeemPercentOfItemTotal) / 100);
  return Math.max(0, Math.min(balance, byShare));
}

// Rupees off for a number of coins.
export function coinsToRupees(coins: number): number {
  return Math.max(0, Math.floor(coins)) * GROWTH_CONFIG.coins.rupeesPerCoin;
}

// The number a customer asked to use: a whole number from 0 up to the cap (the cap check is in applyCoins).
export function parseCoinsRequested(value: unknown): { ok: true; value: number } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") return { ok: true, value: 0 };
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d{1,9}$/.test(value.trim()) ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return { ok: false, error: "Enter a whole number of coins." };
  return { ok: true, value: n };
}

export type CoinsApplied =
  | { ok: true; redeemed: number; commit: () => void }
  | { ok: false; status: number; code: "COINS_OVER_CAP" | "COINS_NOT_ENOUGH"; message: string };

// Debits the coins for one order, inside the order's transaction. Call after the transaction's reads and before its
// writes: this function reads the wallet and then returns `commit`, which writes the ledger entry and the new balance.
// Redeeming more than the cap, or more than the balance, is refused and nothing is written.
export async function applyCoins(
  tx: GrowthTx,
  ref: (path: string) => GrowthRef,
  input: { uid: string; requested: number; itemTotal: number; orderId: string; now: number },
): Promise<CoinsApplied> {
  if (input.requested === 0) return { ok: true, redeemed: 0, commit: () => undefined };
  const ledgerInput: LedgerInput = {
    type: "DEBIT",
    source: "CHECKOUT_REDEMPTION",
    amount: input.requested,
    idempotencyKey: `checkout:${input.orderId}`,
    reason: `Used on order ${input.orderId}`,
    orderId: input.orderId,
    actor: "customer",
  };
  const planned = await planLedgerEntry(tx, ref, input.uid, ledgerInput);
  if (!planned.ok) {
    return { ok: false, status: 409, code: "COINS_NOT_ENOUGH", message: "You do not have enough coins for this. Refresh your bag and try again." };
  }
  const plan = planned.plan;
  const cap = maxRedeemable({ itemTotal: input.itemTotal, balance: plan.before });
  if (input.requested > cap) {
    return { ok: false, status: 409, code: "COINS_OVER_CAP", message: `You can use at most ${cap} coins on this order.` };
  }
  return {
    ok: true,
    redeemed: input.requested,
    commit: () => writeLedgerPlan(tx, plan, input.now),
  };
}

export type AdjustResult =
  | { ok: true; applied: boolean; balance: number }
  | { ok: false; code: "INVALID_AMOUNT" | "INVALID_REASON" | "INVALID_KEY" | "NEGATIVE_BALANCE" | "BAD_ACTOR" };

// Manual adjustment by the GlowVai team: a signed whole-coin amount with a reason. Positive credits, negative debits.
// The idempotency key is required, so a repeated request from the admin panel is applied once.
export async function adjustCoins(
  repo: { runTx<T>(fn: (tx: GrowthTx) => Promise<T>): Promise<T>; ref(path: string): GrowthRef },
  input: { uid: string; amount: number; reason: string; actor: string; idempotencyKey: string; now: number },
): Promise<AdjustResult> {
  const actor = input.actor.trim();
  if (actor.length < 2 || actor.length > 80) return { ok: false, code: "BAD_ACTOR" };
  if (!Number.isInteger(input.amount) || input.amount === 0) return { ok: false, code: "INVALID_AMOUNT" };
  const ledgerInput: LedgerInput = {
    type: input.amount > 0 ? "CREDIT" : "DEBIT",
    source: "ADMIN_ADJUSTMENT",
    amount: Math.abs(input.amount),
    idempotencyKey: `admin:${input.idempotencyKey}`,
    reason: input.reason,
    orderId: null,
    actor,
  };
  return repo.runTx(async (tx): Promise<AdjustResult> => {
    const planned = await planLedgerEntry(tx, (p) => repo.ref(p), input.uid, ledgerInput);
    if (!planned.ok) {
      const code = planned.refusal === "NEGATIVE_BALANCE" ? "NEGATIVE_BALANCE" : planned.refusal === "INVALID_KEY" ? "INVALID_KEY" : planned.refusal === "INVALID_REASON" ? "INVALID_REASON" : "INVALID_AMOUNT";
      return { ok: false, code };
    }
    writeLedgerPlan(tx, planned.plan, input.now);
    return { ok: true, applied: !planned.plan.duplicate, balance: planned.plan.balance };
  });
}
