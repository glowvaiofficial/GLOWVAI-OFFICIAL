// The wallet wired to the live Firestore store and Razorpay. Only server code imports this file. The pure modules
// (rules.ts, topups.ts, verify.ts) take their store and Razorpay functions as arguments, so the tests use stubs.
import "server-only";
import { db } from "../server";
import { firestoreRepo } from "../growth/firestoreRepo";
import { createRazorpayOrder, fetchRazorpayPayment, razorpayKeyId, verifyPaymentSignature } from "../razorpay";
import { creditGiftCardCoins, createTopup, listTopups, topupStatus, walletHistory, walletSummary, type TopupFilters, type CreateResult } from "./topups";
import { applyTopupWebhook, recheckHeldTopup, verifyTopupPayment, type PaymentFacts, type VerifyResult } from "./verify";

const repo = () => firestoreRepo(db());

export function createTopupLive(uid: string, amount: unknown): Promise<CreateResult> {
  return createTopup(
    {
      repo: repo(),
      now: Date.now(),
      keyId: razorpayKeyId(),
      createOrder: (rupees, receipt, notes) => createRazorpayOrder(rupees, receipt, notes),
    },
    { uid, amount },
  );
}

export function topupStatusLive(uid: string, topupId: string) {
  return topupStatus({ repo: repo(), now: Date.now() }, { uid, topupId });
}

export function verifyTopupLive(uid: string, body: { orderId: string; paymentId: string; signature: string }): Promise<VerifyResult> {
  return verifyTopupPayment(
    {
      repo: repo(),
      now: Date.now(),
      verifySignature: verifyPaymentSignature,
      fetchPayment: (id) => fetchRazorpayPayment(id),
    },
    { uid, orderId: body.orderId, paymentId: body.paymentId, signature: body.signature },
  );
}

export function topupWebhookLive(event: string, payment: PaymentFacts): Promise<VerifyResult | null> {
  return applyTopupWebhook({ repo: repo(), now: Date.now(), verifySignature: verifyPaymentSignature, fetchPayment: fetchRazorpayPayment }, { event, payment });
}

export function walletSummaryLive(uid: string) {
  return walletSummary({ repo: repo(), now: Date.now() }, uid);
}

export function walletHistoryLive(uid: string, cursor: string | null) {
  return walletHistory({ repo: repo() }, { uid, cursor });
}

// For the GlowVai team (signed internal route) and the gift card service.
export function listTopupsLive(filters: TopupFilters) {
  return listTopups({ repo: repo() }, filters);
}

export function creditGiftCardValue(uid: string, cardId: string, coins: number) {
  return creditGiftCardCoins({ repo: repo(), now: Date.now() }, { uid, cardId, coins });
}

// For the GlowVai team (signed internal route): re-checks a held capture against Razorpay. See recheckHeldTopup.
export function recheckHeldTopupLive(input: { topupId?: string; captureId?: string }) {
  return recheckHeldTopup({ repo: repo(), now: Date.now(), verifySignature: verifyPaymentSignature, fetchPayment: fetchRazorpayPayment }, input);
}
