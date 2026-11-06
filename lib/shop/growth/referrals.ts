// Referrals: each customer's code, applying a friend's code, and the reward on delivery. Every write happens in a
// transaction; every credit goes through the ledger (ledger.ts), so the same rules apply here as at checkout.
//
// Reward rule (growth-config.ts): when the referee's first DELIVERED order is confirmed, the referee and the referrer
// each get coins, once per referee. The "once" is a flag on referrals/{refereeUid} written in the same transaction as
// the credits, so a repeated call for the same or another order grants nothing new.
import { GROWTH_CONFIG } from "../growth-config";
import { generateReferralCode, normaliseReferralCode } from "./codes";
import { planLedgerEntry, writeLedgerPlan, type LedgerInput } from "./ledger";
import type { GrowthRef, GrowthRepo, GrowthTx } from "./repo";

type Ref = (path: string) => GrowthRef;

export const referralPath = (uid: string) => `referrals/${uid}`;
export const codePath = (code: string) => `referralCodes/${code}`;
export const grantPath = (orderId: string) => `referralGrants/${orderId}`;

// The customer's code, created once. Codes are unique: the code document is created in the same transaction that
// checks it is free, so two customers can never receive the same code.
export async function getOrCreateReferralCode(
  repo: GrowthRepo,
  uid: string,
  now: number,
  generate: () => string = generateReferralCode,
): Promise<string | null> {
  return repo.runTx(async (tx) => {
    const ref = repo.ref(referralPath(uid));
    const own = await tx.get(ref);
    const existing = own.data()?.code;
    if (own.exists && typeof existing === "string" && existing) return existing;
    let chosen: string | null = null;
    for (let attempt = 0; attempt < GROWTH_CONFIG.referral.maxCodeAttempts && !chosen; attempt++) {
      const candidate = generate();
      const snap = await tx.get(repo.ref(codePath(candidate)));
      if (!snap.exists) chosen = candidate;
    }
    if (!chosen) return null;
    tx.create(repo.ref(codePath(chosen)), { code: chosen, ownerUid: uid, createdAt: now });
    tx.set(ref, { uid, code: chosen, codeCreatedAt: now }, { merge: true });
    return chosen;
  });
}

export type ApplyResult =
  | { ok: true }
  | { ok: false; code: "INVALID_CODE" | "UNKNOWN_CODE" | "OWN_CODE" | "ALREADY_APPLIED" | "NOT_NEW_CUSTOMER"; message: string };

const MESSAGES: Record<Exclude<ApplyResult, { ok: true }>["code"], string> = {
  INVALID_CODE: "Enter an 8-character referral code.",
  UNKNOWN_CODE: "That referral code was not found. Check it and try again.",
  OWN_CODE: "You cannot use your own referral code.",
  ALREADY_APPLIED: "You have already used a referral code on this account.",
  NOT_NEW_CUSTOMER: "A referral code can only be used before your first order.",
};

// A new customer applies a friend's code once, before their first order. Refused: a malformed code, an unknown code,
// their own code, a second code on the same account, or any order already placed.
export async function applyReferralCode(repo: GrowthRepo, input: { uid: string; code: unknown; now: number }): Promise<ApplyResult> {
  const code = normaliseReferralCode(input.code);
  if (!code) return fail("INVALID_CODE");
  const earlier = await repo.query("orders", [["userId", "==", input.uid]], { limit: 1 });
  if (earlier.length > 0) return fail("NOT_NEW_CUSTOMER");
  return repo.runTx(async (tx): Promise<ApplyResult> => {
    const own = await tx.get(repo.ref(referralPath(input.uid)));
    if (own.exists && own.data()?.appliedCode) return fail("ALREADY_APPLIED");
    const owner = await tx.get(repo.ref(codePath(code)));
    if (!owner.exists) return fail("UNKNOWN_CODE");
    const referrerUid = String(owner.data()?.ownerUid ?? "");
    if (!referrerUid || referrerUid === input.uid) return fail("OWN_CODE");
    tx.set(
      repo.ref(referralPath(input.uid)),
      { uid: input.uid, appliedCode: code, referrerUid, appliedAt: input.now, rewardStatus: "PENDING" },
      { merge: true },
    );
    return { ok: true };
  });
}

function fail(code: Exclude<ApplyResult, { ok: true }>["code"]): ApplyResult {
  return { ok: false, code, message: MESSAGES[code] };
}

export interface ReferralStatus {
  code: string | null;
  applied: boolean;
  // PENDING: applied, no reward yet. REWARDED: both credits are in the ledger. NONE: no code was applied.
  rewardStatus: "NONE" | "PENDING" | "REWARDED";
  rewardCoins: number;
  referredCount: number;
  rewardedCount: number;
}

// What the customer may see about their referrals. Counts only: no names or contact details of the other customers.
export async function referralStatus(repo: GrowthRepo, uid: string): Promise<ReferralStatus> {
  const own = await repo.get(repo.ref(referralPath(uid)));
  const d = own.data() ?? {};
  const referred = await repo.query("referrals", [["referrerUid", "==", uid]], { limit: 200 });
  const rewardedCount = referred.filter((r) => r.data()?.rewardStatus === "REWARDED").length;
  const applied = typeof d.appliedCode === "string" && d.appliedCode.length > 0;
  const rewardStatus = !applied ? "NONE" : d.rewardStatus === "REWARDED" ? "REWARDED" : "PENDING";
  return {
    code: typeof d.code === "string" && d.code ? d.code : null,
    applied,
    rewardStatus,
    rewardCoins: rewardStatus === "REWARDED" ? GROWTH_CONFIG.referral.refereeCoins : 0,
    referredCount: referred.length,
    rewardedCount,
  };
}

export type GrantResult =
  | { ok: true; granted: true; refereeCoins: number; referrerCoins: number }
  | { ok: true; granted: false; reason: "NOT_DELIVERED" | "NO_REFERRAL" | "ALREADY_GRANTED" | "ALREADY_REWARDED" }
  | { ok: false; code: "ORDER_NOT_FOUND" | "BAD_ACTOR" | "LEDGER_REFUSED" };

// Grants the referral rewards for an order that has reached DELIVERED. Called by the staff delivered path (through the
// signed internal route). Idempotent per order and per referee: calling it again changes nothing.
export async function grantReferralRewards(repo: GrowthRepo, input: { orderId: string; actor: string; now: number }): Promise<GrantResult> {
  const actor = input.actor.trim();
  if (actor.length < 2 || actor.length > 80) return { ok: false, code: "BAD_ACTOR" };
  return repo.runTx(async (tx): Promise<GrantResult> => {
    const ref = repo.ref;
    const order = await tx.get(ref(`orders/${input.orderId}`));
    if (!order.exists) return { ok: false, code: "ORDER_NOT_FOUND" };
    const overlay = await tx.get(ref(`admin_orders/${input.orderId}`));
    const refereeUid = String(order.data()?.userId ?? "");
    const fulfilment = String(overlay.data()?.fulfilment ?? "");
    const delivered = (order.data()?.status === "DELIVERED" || fulfilment === "DELIVERED") && fulfilment !== "CANCELLED";
    if (!refereeUid) return { ok: true, granted: false, reason: "NO_REFERRAL" };
    if (!delivered) return { ok: true, granted: false, reason: "NOT_DELIVERED" };
    const grant = await tx.get(ref(grantPath(input.orderId)));
    if (grant.exists) return { ok: true, granted: false, reason: "ALREADY_GRANTED" };
    const link = await tx.get(ref(referralPath(refereeUid)));
    const linked = link.data() ?? {};
    if (!linked.appliedCode || !linked.referrerUid) return { ok: true, granted: false, reason: "NO_REFERRAL" };
    if (linked.rewardStatus === "REWARDED") return { ok: true, granted: false, reason: "ALREADY_REWARDED" };
    const referrerUid = String(linked.referrerUid);

    const referee = await planLedgerEntry(tx, ref, refereeUid, creditFor("REFERRAL_REFEREE", refereeUid, GROWTH_CONFIG.referral.refereeCoins, input.orderId, actor));
    const referrer = await planLedgerEntry(tx, ref, referrerUid, creditFor("REFERRAL_REFERRER", refereeUid, GROWTH_CONFIG.referral.referrerCoins, input.orderId, actor));
    if (!referee.ok || !referrer.ok) return { ok: false, code: "LEDGER_REFUSED" };

    writeLedgerPlan(tx, referee.plan, input.now);
    writeLedgerPlan(tx, referrer.plan, input.now);
    writeRewardFlags(tx, repo, refereeUid, input.orderId, input.now);
    tx.create(ref(grantPath(input.orderId)), { orderId: input.orderId, refereeUid, referrerUid, grantedAt: input.now, actor });
    return { ok: true, granted: true, refereeCoins: GROWTH_CONFIG.referral.refereeCoins, referrerCoins: GROWTH_CONFIG.referral.referrerCoins };
  });
}

function creditFor(source: "REFERRAL_REFEREE" | "REFERRAL_REFERRER", refereeUid: string, amount: number, orderId: string, actor: string): LedgerInput {
  return {
    type: "CREDIT",
    source,
    amount,
    // One credit per referee per side: a repeat grant for the same referee finds the key and adds nothing.
    idempotencyKey: `${source === "REFERRAL_REFEREE" ? "referral-referee" : "referral-referrer"}:${refereeUid}`,
    reason: source === "REFERRAL_REFEREE" ? "Welcome reward for your first delivered order" : "Referral reward: your friend's first order was delivered",
    orderId,
    actor,
  };
}

function writeRewardFlags(tx: GrowthTx, repo: GrowthRepo, refereeUid: string, orderId: string, now: number): void {
  tx.set(repo.ref(referralPath(refereeUid)), { rewardStatus: "REWARDED", rewardOrderId: orderId, rewardedAt: now }, { merge: true });
}
