// Rider sign-in and the rider session check. The partner is found by the phone hash stored on their deliveryPartners
// document (the admin team writes it when the partner is created), then the PIN is checked against the stored scrypt
// hash. Sign-in attempts are counted in Firestore so the limits hold across serverless instances.
import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { db, indianMobile } from "@/lib/shop/server";
import { RiderError } from "./errors";
import { attemptStep, type AttemptState } from "./lockout";
import { burnVerification, hashSecret, PIN_PATTERN, riderPhoneHash, verifySecret, weakPin } from "./pin";
import { RIDER_COOKIE, riderSecret, signRiderSession, verifyRiderSession } from "./session";

export interface RiderPartner {
  id: string;
  name: string;
}

export const partnersCol = () => db().collection("deliveryPartners");
const attemptsCol = () => db().collection("riderSignInAttempts");

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/**
 * Staff sets or changes a partner's PIN. Stores only the scrypt hash. The PIN itself is never logged or returned.
 * Called by the admin team when a partner is created or when the PIN is reset.
 */
export async function setPartnerPin(partnerId: string, pin: string, actor = "staff"): Promise<void> {
  if (typeof partnerId !== "string" || !partnerId || partnerId.length > 128) throw new Error("setPartnerPin: a partner id is required.");
  if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) throw new Error("setPartnerPin: the PIN must be exactly 6 digits.");
  if (weakPin(pin)) throw new Error("setPartnerPin: that PIN is too easy to guess. Choose another.");
  const ref = partnersCol().doc(partnerId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("setPartnerPin: no delivery partner with that id.");
  const pinHash = await hashSecret(pin);
  const now = Date.now();
  const batch = db().batch();
  batch.update(ref, { pinHash, pinSetAt: now });
  batch.set(db().collection("riderAudit").doc(), { at: now, action: "PIN_SET", partnerId, actor });
  await batch.commit();
}

/** Counts one attempt against each key. Returns the longest wait when one of them is locked. */
async function countAttempts(keys: string[], now: number): Promise<number> {
  const store = db();
  const denied = await store.runTransaction(async (tx) => {
    const refs = keys.map((k) => attemptsCol().doc(k));
    const snaps = await tx.getAll(...refs);
    let wait = 0;
    snaps.forEach((snap, i) => {
      const decision = attemptStep(snap.exists ? (snap.data() as AttemptState) : null, now);
      if (!decision.allowed) wait = Math.max(wait, decision.retryAfterMs);
      tx.set(refs[i], decision.state);
    });
    return wait;
  });
  return denied;
}

function lockedError(retryAfterMs: number): RiderError {
  const seconds = Math.ceil(retryAfterMs / 1000);
  return new RiderError("LOCKED", 429, "Too many attempts. Wait a few minutes and try again.", seconds);
}

export interface SignInInput {
  phone: unknown;
  pin: unknown;
  ip: string;
  now: number;
}

/**
 * Signs a partner in. Refused with the same message whether the phone is unknown, inactive, has no PIN, or the PIN is
 * wrong, so the screen does not reveal which numbers are riders.
 */
export async function signInWithPin(input: SignInInput): Promise<{ partner: RiderPartner; token: string }> {
  const digits = indianMobile(input.phone);
  const pin = typeof input.pin === "string" ? input.pin.trim() : "";
  if (!digits || !PIN_PATTERN.test(pin)) throw new RiderError("INVALID_INPUT", 400, "Enter your 10-digit mobile number and 6-digit PIN.");
  const secret = riderSecret();
  const phoneKey = riderPhoneHash(digits);
  const ipKey = sha256(input.ip || "unknown");

  const wait = await countAttempts([`p_${phoneKey}`, `i_${ipKey}`], input.now);
  if (wait > 0) throw lockedError(wait);

  const matches = await partnersCol().where("phoneHash", "==", phoneKey).limit(2).get();
  // One match only. Two partners with the same number is refused, not guessed.
  const doc = matches.size === 1 ? matches.docs[0] : null;
  const data = (doc?.data() ?? {}) as Record<string, unknown>;
  // A PIN is checked on every path, so a miss costs the same time as a wrong PIN.
  const pinOk = doc ? await verifySecret(pin, data.pinHash) : await burnVerification(pin);
  if (!doc || data.active !== true || !pinOk) {
    throw new RiderError("INVALID_CREDENTIALS", 401, "The phone number or PIN is not right.");
  }
  // A correct sign-in clears this phone's counter. The IP counter stays.
  await attemptsCol().doc(`p_${phoneKey}`).delete();
  const partner = { id: doc.id, name: String(data.name ?? "") };
  return { partner, token: signRiderSession(doc.id, input.now, secret) };
}

/** The partner behind this request's session cookie, or null. A deactivated partner loses access on the next call. */
export async function riderFrom(req: NextRequest, now = Date.now()): Promise<RiderPartner | null> {
  const claim = verifyRiderSession(req.cookies.get(RIDER_COOKIE)?.value, now, riderSecret());
  if (!claim) return null;
  const snap = await partnersCol().doc(claim.partnerId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  if (data.active !== true) return null;
  return { id: snap.id, name: String(data.name ?? "") };
}

/** A partner's first name for the greeting. Never the full name on the rider screen. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
