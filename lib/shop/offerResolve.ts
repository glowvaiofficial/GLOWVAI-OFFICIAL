// The one place that decides what a bag is taken off. Used by the cart quote and by the order, so both give the same answer.
// Candidates: a built-in code, a code the customer typed (an admin offer), and every automatic offer. The largest wins.
// A code the customer typed that is not valid is an error (the order is not placed), as before.
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { COUPON_VALUES } from "@/glowvai-app/shared/pricing-rules.mjs";
import { chooseBest, evaluateOffer, normalizeCode, type BagCandidate, type OfferLine } from "./offers";
import { findAutomaticOffers, findOfferByCode, offerUsage } from "./offerLookup";

export type ResolveResult = { ok: true; chosen: BagCandidate | null } | { ok: false; error: string };

export async function resolveBag(
  store: Firestore,
  input: { rawCode: string | null; lines: OfferLine[]; uid: string | null; now: number },
): Promise<ResolveResult> {
  const subtotal = input.lines.reduce((s, l) => s + l.total, 0);
  const candidates: BagCandidate[] = [];
  const typed = input.rawCode && input.rawCode.trim() !== "" ? input.rawCode.trim().toUpperCase() : null;

  if (typed) {
    const builtIn = (COUPON_VALUES as Record<string, number>)[typed];
    if (builtIn !== undefined) {
      candidates.push({ source: "builtin", code: typed, offerId: null, discount: Math.min(builtIn, subtotal), label: `₹${builtIn} off` });
    } else {
      const code = normalizeCode(typed);
      const offer = code ? await findOfferByCode(store, code) : null;
      if (!offer) return { ok: false, error: "That coupon code is not valid." };
      const usage = await offerUsage(store, offer, input.uid);
      const verdict = evaluateOffer(offer, input.lines, input.now, usage);
      if (!verdict.ok) return { ok: false, error: verdict.error };
      candidates.push({ source: "code", code: offer.code, offerId: offer.id, discount: verdict.discount, label: verdict.label });
    }
  }

  for (const offer of await findAutomaticOffers(store)) {
    const usage = await offerUsage(store, offer, input.uid);
    const verdict = evaluateOffer(offer, input.lines, input.now, usage);
    if (verdict.ok) candidates.push({ source: "auto", code: null, offerId: offer.id, discount: verdict.discount, label: verdict.label });
  }

  return { ok: true, chosen: chooseBest(candidates) };
}
