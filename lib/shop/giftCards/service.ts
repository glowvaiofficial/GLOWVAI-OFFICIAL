// Gift card transactions: issuing a card after a verified purchase, and crediting a card to a customer's wallet as Glow
// coins. Both run through the GrowthRepo interface (the same one the wallet ledger uses), so they are tested with the
// in-memory repo and run on Firestore in production (firestoreRepo.ts).
//
// Documents:
//   giftCardPurchases/{purchaseId}   one purchase: uid, amountRupees, recipient, status PENDING_PAYMENT | ISSUED, cardId
//   giftCards/{cardId}               one card: status ACTIVE | REDEEMED, amountRupees, coins, lastFour, codeSalt, codeHash
//   wallets/{uid}/ledger/...         the coins ledger (lib/shop/growth/ledger.ts), entry keyed by giftCardCreditKey(cardId)
import type { GrowthRepo, GrowthTx } from "../growth/repo";
import { planLedgerEntry, writeLedgerPlan, type LedgerInput } from "../growth/ledger";
import { codeMatches, coinsForCard, giftCardCreditKey, hashGiftCode, lastFourOf, newCodeSalt, cardIdFor, type GiftCardStatus } from "./rules";

export const purchasePath = (id: string) => `giftCardPurchases/${id}`;
export const cardPath = (cardId: string) => `giftCards/${cardId}`;

export type CreditOutcome =
  | { ok: true; coins: number; balance: number | null; alreadyRedeemed: boolean }
  | { ok: false; code: "INVALID_CODE" | "ALREADY_REDEEMED" | "LEDGER_REFUSED" };

// Issues a card for a purchase whose payment has been verified. Idempotent: a purchase that is already ISSUED returns its
// card id without making a second card (and without a code, which is only ever shown once).
export async function issueGiftCard(
  repo: GrowthRepo,
  input: { purchaseId: string; uid: string; razorpayOrderId: string; paymentId: string; code: string; now: number },
): Promise<{ ok: true; cardId: string; alreadyIssued: boolean } | { ok: false; code: "NOT_FOUND" | "ORDER_MISMATCH" | "NOT_PAYABLE" }> {
  const salt = newCodeSalt();
  const cardId = cardIdFor(input.code);
  return repo.runTx(async (tx): Promise<{ ok: true; cardId: string; alreadyIssued: boolean } | { ok: false; code: "NOT_FOUND" | "ORDER_MISMATCH" | "NOT_PAYABLE" }> => {
    const purchase = await tx.get(repo.ref(purchasePath(input.purchaseId)));
    if (!purchase.exists) return { ok: false, code: "NOT_FOUND" };
    const p = purchase.data() ?? {};
    if (p.uid !== input.uid) return { ok: false, code: "NOT_FOUND" };
    if (p.razorpayOrderId !== input.razorpayOrderId) return { ok: false, code: "ORDER_MISMATCH" };
    if (p.status === "ISSUED") return { ok: true, cardId: String(p.cardId), alreadyIssued: true };
    if (p.status !== "PENDING_PAYMENT") return { ok: false, code: "NOT_PAYABLE" };
    const rupees = Number(p.amountRupees);
    tx.create(repo.ref(cardPath(cardId)), {
      cardId,
      status: "ACTIVE" satisfies GiftCardStatus,
      amountRupees: rupees,
      coins: coinsForCard(rupees),
      recipientName: String(p.recipientName ?? "").slice(0, 60),
      message: String(p.message ?? "").slice(0, 200),
      purchasedBy: input.uid,
      purchaseId: input.purchaseId,
      lastFour: lastFourOf(input.code),
      codeSalt: salt,
      codeHash: hashGiftCode(input.code, salt),
      createdAt: input.now,
      redeemedBy: null,
      redeemedAt: null,
    });
    tx.update(repo.ref(purchasePath(input.purchaseId)), { status: "ISSUED", cardId, paymentId: input.paymentId, issuedAt: input.now });
    return { ok: true, cardId, alreadyIssued: false };
  });
}

// Credits a gift card to the customer's wallet as Glow coins and marks the card REDEEMED, in one transaction.
//  - A wrong code, or a code for no card, gives INVALID_CODE and writes nothing.
//  - A card already redeemed by this customer returns the same result again and credits nothing more (idempotent: the
//    ledger key is giftcard:{cardId}, so a retried request cannot credit twice even if the card write were lost).
//  - A card redeemed by someone else gives ALREADY_REDEEMED.
// The code is compared with the stored salted hash in constant time.
export async function creditGiftCard(repo: GrowthRepo, uid: string, code: string, now: number): Promise<CreditOutcome> {
  const cardId = cardIdFor(code);
  return repo.runTx(async (tx: GrowthTx): Promise<CreditOutcome> => {
    const card = await tx.get(repo.ref(cardPath(cardId)));
    if (!card.exists) return { ok: false, code: "INVALID_CODE" };
    const c = card.data() ?? {};
    if (!codeMatches(code, String(c.codeSalt ?? ""), String(c.codeHash ?? ""))) return { ok: false, code: "INVALID_CODE" };
    const coins = Number(c.coins);
    if (c.status === "REDEEMED") {
      if (c.redeemedBy !== uid) return { ok: false, code: "ALREADY_REDEEMED" };
      return { ok: true, coins, balance: null, alreadyRedeemed: true };
    }
    if (c.status !== "ACTIVE" || !Number.isInteger(coins) || coins <= 0) return { ok: false, code: "INVALID_CODE" };
    const ledger: LedgerInput = {
      type: "CREDIT",
      source: "GIFT_CARD",
      amount: coins,
      idempotencyKey: giftCardCreditKey(cardId),
      reason: `Gift card ending ${String(c.lastFour ?? "")}`.slice(0, 200),
      orderId: null,
      actor: "customer",
    };
    const planned = await planLedgerEntry(tx, (p) => repo.ref(p), uid, ledger);
    if (!planned.ok) return { ok: false, code: "LEDGER_REFUSED" };
    writeLedgerPlan(tx, planned.plan, now);
    tx.update(repo.ref(cardPath(cardId)), { status: "REDEEMED", redeemedBy: uid, redeemedAt: now });
    return { ok: true, coins, balance: planned.plan.balance, alreadyRedeemed: false };
  });
}
