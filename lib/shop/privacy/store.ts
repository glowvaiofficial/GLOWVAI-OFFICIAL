// Firestore reads and writes for the privacy centre. Server only, Admin SDK only (no Firestore rules change). Every path
// starts from the uid of the verified ID token, so a request can never reach another customer's records.
//
//   users/{uid}                       profile and consents (the fields the GlowVai admin panel reads)
//   users/{uid}/devices/{hash}        device list: name (coarse), firstSeenAt, lastSeenAt
//   users/{uid}/activity/{id}         privacy activity: type, at, detail (no personal data)
//   users/{uid}/payments/profile      Razorpay customer id and preferred token id (no card data)
//   deletionRequests/{id}             account deletion requests (status REQUESTED, ...)
//   privacyCounters/{key}             windowed counters for the daily and lockout limits (keys are hashed)
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../server";
import { countAttempt, planSighting, type DeletionStatus, type KnownDevice, type WindowCounter } from "./rules";

type Doc = Record<string, unknown>;
const userDoc = (uid: string) => db().collection("users").doc(uid);
const devicesOf = (uid: string) => userDoc(uid).collection("devices");
const activityOf = (uid: string) => userDoc(uid).collection("activity");
const deletionsRef = () => db().collection("deletionRequests");

export const sha256Key = (s: string): string => createHash("sha256").update(s).digest("hex");

// ---------- Counters (daily limits and lockouts) ----------

// Counts one attempt against a window, durably (a Firestore transaction, so every server instance sees the same count).
export async function takeAttempt(key: string, max: number, windowMs: number, now: number): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const ref = db().collection("privacyCounters").doc(sha256Key(key));
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data() as WindowCounter) : null;
    const outcome = countAttempt(current, now, max, windowMs);
    tx.set(ref, { count: outcome.next.count, windowStart: outcome.next.windowStart, updatedAt: now });
    return { allowed: outcome.allowed, retryAfterMs: outcome.retryAfterMs };
  });
}

// ---------- Devices ----------

export interface DeviceRecord extends KnownDevice {
  name: string;
}

export async function listDeviceRecords(uid: string): Promise<DeviceRecord[]> {
  const snap = await devicesOf(uid).limit(50).get();
  return snap.docs.map((d) => {
    const v = d.data();
    return { hash: d.id, name: String(v.name ?? "Unknown device").slice(0, 40), firstSeenAt: Number(v.firstSeenAt) || 0, lastSeenAt: Number(v.lastSeenAt) || 0 };
  });
}

// Records a sighting of this device on a session-establishing call. Writes at most one device refresh per 10 minutes,
// creates the device when it is new, and removes the least recently seen devices when the account is at the cap.
export async function recordSighting(uid: string, hash: string, name: string, now: number): Promise<void> {
  const store = db();
  const col = devicesOf(uid);
  await store.runTransaction(async (tx) => {
    const [all, mine] = await Promise.all([tx.get(col.limit(50)), tx.get(col.doc(hash))]);
    const devices: KnownDevice[] = all.docs.map((d) => ({ hash: d.id, firstSeenAt: Number(d.data().firstSeenAt) || 0, lastSeenAt: Number(d.data().lastSeenAt) || 0 }));
    const known = mine.exists ? { lastSeenAt: Number(mine.data()?.lastSeenAt) || 0 } : null;
    const plan = planSighting(devices, hash, now);
    if (plan.kind === "none") return;
    if (plan.kind === "touch") {
      tx.update(col.doc(hash), { lastSeenAt: now, name });
      return;
    }
    for (const evicted of plan.evict) tx.delete(col.doc(evicted));
    if (known) tx.update(col.doc(hash), { lastSeenAt: now, name });
    else tx.set(col.doc(hash), { name, firstSeenAt: now, lastSeenAt: now });
  });
}

export async function removeDevice(uid: string, hash: string): Promise<boolean> {
  const ref = devicesOf(uid).doc(hash);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

// Removes every device except the current one. Returns how many were removed.
export async function removeOtherDevices(uid: string, currentHash: string): Promise<number> {
  const snap = await devicesOf(uid).limit(50).get();
  const others = snap.docs.filter((d) => d.id !== currentHash);
  if (others.length === 0) return 0;
  const batch = db().batch();
  for (const d of others) batch.delete(d.ref);
  await batch.commit();
  return others.length;
}

// ---------- Activity ----------

export async function logActivity(uid: string, type: string, detail: string, now: number): Promise<void> {
  await activityOf(uid).doc(`${now}_${randomBytes(4).toString("hex")}`).set({ type, at: now, detail: detail.slice(0, 200) });
}

export async function recentActivity(uid: string, limit: number): Promise<Doc[]> {
  const snap = await activityOf(uid).limit(limit).get();
  return snap.docs.map((d) => ({ ...d.data() }));
}

// ---------- Account deletion requests ----------

export interface DeletionRecord {
  id: string;
  uid: string;
  status: DeletionStatus;
  requestedAt: number;
  cancelledAt: number | null;
}

// The customer's most recent deletion request, if any.
export async function latestDeletion(uid: string): Promise<DeletionRecord | null> {
  const snap = await deletionsRef().where("uid", "==", uid).limit(20).get();
  const rows = snap.docs.map((d) => toDeletion(d.id, d.data()));
  rows.sort((a, b) => b.requestedAt - a.requestedAt);
  return rows[0] ?? null;
}

export function toDeletion(id: string, v: Doc): DeletionRecord {
  return {
    id,
    uid: String(v.uid ?? ""),
    status: (["REQUESTED", "CANCELLED", "PROCESSING", "COMPLETED"].includes(String(v.status)) ? v.status : "REQUESTED") as DeletionStatus,
    requestedAt: Number(v.requestedAt) || 0,
    cancelledAt: typeof v.cancelledAt === "number" ? v.cancelledAt : null,
  };
}

// Runs a deletion change inside one transaction. `decide` gets the customer's requests as they are and returns the
// change to write, or null for nothing to write.
export async function changeDeletion(
  uid: string,
  decide: (rows: DeletionRecord[]) => { write: { id?: string; create?: true; status: DeletionStatus; requestedAt?: number; cancelledAt?: number | null } } | { refuse: string },
): Promise<{ ok: true; record: DeletionRecord } | { ok: false; error: string }> {
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(deletionsRef().where("uid", "==", uid).limit(20));
    const rows = snap.docs.map((d) => toDeletion(d.id, d.data())).sort((a, b) => b.requestedAt - a.requestedAt);
    const decision = decide(rows);
    if ("refuse" in decision) return { ok: false as const, error: decision.refuse };
    const w = decision.write;
    if (w.create) {
      const id = `del_${randomBytes(12).toString("hex")}`;
      const record: DeletionRecord = { id, uid, status: w.status, requestedAt: w.requestedAt ?? 0, cancelledAt: null };
      tx.create(deletionsRef().doc(id), { uid, status: w.status, requestedAt: record.requestedAt, cancelledAt: null, updatedAt: record.requestedAt });
      return { ok: true as const, record };
    }
    const ref = deletionsRef().doc(String(w.id));
    const current = rows.find((r) => r.id === w.id);
    if (!current) return { ok: false as const, error: "That request is not on your account." };
    tx.update(ref, { status: w.status, cancelledAt: w.cancelledAt ?? null, updatedAt: w.cancelledAt ?? Date.now() });
    return { ok: true as const, record: { ...current, status: w.status, cancelledAt: w.cancelledAt ?? null } };
  });
}

// ---------- Payments profile (Razorpay ids only) ----------

export interface PaymentsProfile {
  razorpayCustomerId: string | null;
  preferredTokenId: string | null;
  pendingSetupOrderId: string | null;
}

const paymentsRef = (uid: string) => userDoc(uid).collection("payments").doc("profile");

export async function readPaymentsProfile(uid: string): Promise<PaymentsProfile> {
  const snap = await paymentsRef(uid).get();
  const d = snap.data() ?? {};
  return {
    razorpayCustomerId: typeof d.razorpayCustomerId === "string" ? d.razorpayCustomerId : null,
    preferredTokenId: typeof d.preferredTokenId === "string" ? d.preferredTokenId : null,
    pendingSetupOrderId: typeof d.pendingSetupOrderId === "string" ? d.pendingSetupOrderId : null,
  };
}

export async function writePaymentsProfile(uid: string, patch: Partial<PaymentsProfile>, now: number): Promise<void> {
  await paymentsRef(uid).set({ ...patch, updatedAt: now }, { merge: true });
}
