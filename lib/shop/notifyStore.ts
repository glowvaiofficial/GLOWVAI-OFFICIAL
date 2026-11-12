// Firestore reads and writes for customer notifications: the in-app list (users/{uid}/notifications), push tokens
// (users/{uid}/pushTokens) and preferences (users/{uid}.notificationPrefs). Server-only, Admin SDK only. Clients never
// reach these collections directly; the routes under app/api/shop/notifications/* call this module.
import "server-only";
import { FieldPath } from "firebase-admin/firestore";
import { db } from "./server";
import {
  MAX_NOTIFICATIONS,
  MAX_READ_IDS,
  MAX_TOKENS_PER_USER,
  decodeCursor,
  encodeCursor,
  planMarkRead,
  planTokenSave,
  prefsFrom,
  tokenHash,
  type NotificationPrefs,
  type NotificationView,
  type ReadRequest,
} from "./notifications/policy";
import { isRelatedId, type RenderedNotification } from "./notifications/templates";
import type { PushTokenType } from "./notifications/policy";

const userDoc = (uid: string) => db().collection("users").doc(uid);
const inbox = (uid: string) => userDoc(uid).collection("notifications");
const tokens = (uid: string) => userDoc(uid).collection("pushTokens");

// Writes one in-app notification and keeps the list at MAX_NOTIFICATIONS, deleting the oldest in the same transaction.
// The read of the overflow happens before any write, as Firestore requires.
export async function writeInApp(uid: string, rendered: RenderedNotification, relatedId: string | null, now: number): Promise<string> {
  const store = db();
  const col = inbox(uid);
  const ref = col.doc();
  await store.runTransaction(async (tx) => {
    // The newest MAX-1 existing notifications stay; everything after them (the oldest) is deleted. Only that overflow is
    // read, so a write costs one query rather than reading the whole list. The pure rule is planTrim in policy.ts.
    const overflow = await tx.get(col.orderBy("createdAt", "desc").offset(MAX_NOTIFICATIONS - 1).limit(200));
    for (const d of overflow.docs) tx.delete(d.ref);
    tx.create(ref, {
      type: rendered.type,
      title: rendered.title,
      body: rendered.body,
      relatedType: rendered.relatedType,
      relatedId: relatedId ?? null,
      createdAt: now,
      readAt: null,
    });
  });
  return ref.id;
}

const toView = (id: string, d: Record<string, unknown>): NotificationView => ({
  id,
  type: String(d.type ?? ""),
  title: String(d.title ?? ""),
  body: String(d.body ?? ""),
  relatedType: (d.relatedType as NotificationView["relatedType"]) ?? "account",
  relatedId: isRelatedId(d.relatedId) ? d.relatedId : null,
  createdAt: Number(d.createdAt) || 0,
  readAt: typeof d.readAt === "number" ? d.readAt : null,
});

// One page, newest first. The cursor is the last item of the previous page.
export async function listInApp(uid: string, limit: number, cursor: string | null): Promise<{ items: NotificationView[]; nextCursor: string | null } | null> {
  const after = cursor === null ? null : decodeCursor(cursor);
  if (cursor !== null && !after) return null;
  let query = inbox(uid).orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(limit + 1);
  if (after) query = query.startAfter(after.createdAt, after.id);
  const snap = await query.get();
  const pageDocs = snap.docs.slice(0, limit);
  const items = pageDocs.map((d) => toView(d.id, d.data()));
  const last = items[items.length - 1];
  const nextCursor = snap.docs.length > limit && last ? encodeCursor(last.createdAt, last.id) : null;
  return { items, nextCursor };
}

export async function unreadCount(uid: string): Promise<number> {
  const agg = await inbox(uid).where("readAt", "==", null).count().get();
  return agg.data().count;
}

// Marks notifications read. Only the caller's own collection is read, so an id that belongs to someone else (or does
// not exist) matches nothing. Returns how many were marked.
export async function markInAppRead(uid: string, request: ReadRequest, now: number): Promise<number> {
  const col = inbox(uid);
  const owned = request.all
    ? (await col.where("readAt", "==", null).limit(MAX_READ_IDS).get()).docs.map((d) => ({ id: d.id, readAt: d.data().readAt ?? null }))
    : (await db().getAll(...(request.ids ?? []).map((id) => col.doc(id)))).filter((s) => s.exists).map((s) => ({ id: s.id, readAt: s.data()?.readAt ?? null }));
  const ids = planMarkRead(owned, request);
  if (ids.length === 0) return 0;
  const batch = db().batch();
  for (const id of ids) batch.update(col.doc(id), { readAt: now });
  await batch.commit();
  return ids.length;
}

// Preferences and the marketing consent the profile stores. Missing values take the defaults.
export async function prefsFor(uid: string): Promise<{ prefs: NotificationPrefs; marketingConsent: boolean }> {
  const snap = await userDoc(uid).get();
  const d = (snap.data() ?? {}) as Record<string, unknown>;
  const consents = (d.consents ?? {}) as Record<string, unknown>;
  return { prefs: prefsFrom(d.notificationPrefs), marketingConsent: consents.marketing === true };
}

export async function savePrefs(uid: string, patch: Partial<NotificationPrefs>, now: number): Promise<NotificationPrefs> {
  const ref = userDoc(uid);
  let saved: NotificationPrefs = prefsFrom(null);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    saved = { ...prefsFrom((snap.data() ?? {}).notificationPrefs), ...patch };
    tx.set(ref, { notificationPrefs: saved, updatedAt: now }, { merge: true });
  });
  return saved;
}

// Saves an FCM token for the customer. The document id is the SHA-256 of the token. Over the cap, the least recently
// refreshed token is removed in the same transaction.
export async function saveToken(uid: string, token: string, now: number, tokenType: PushTokenType = "FCM"): Promise<void> {
  const col = tokens(uid);
  const id = tokenHash(token);
  await db().runTransaction(async (tx) => {
    const existing = await tx.get(col.orderBy("updatedAt", "asc").limit(MAX_TOKENS_PER_USER + 20));
    const plan = planTokenSave(
      existing.docs.map((d) => ({ id: d.id, updatedAt: Number(d.data().updatedAt) || 0 })),
      id,
    );
    for (const evict of plan.evict) tx.delete(col.doc(evict));
    tx.set(col.doc(id), { token, tokenType, updatedAt: now, ...(plan.alreadyRegistered ? {} : { createdAt: now }) }, { merge: true });
  });
}

export async function removeToken(uid: string, token: string): Promise<void> {
  await tokens(uid).doc(tokenHash(token)).delete();
}

// Every token the customer has. Used by the sender only; never returned to a client.
export async function tokensFor(uid: string): Promise<{ id: string; token: string; tokenType: PushTokenType }[]> {
  const snap = await tokens(uid).limit(MAX_TOKENS_PER_USER).get();
  return snap.docs
    .map((d) => ({ id: d.id, token: String(d.data().token ?? ""), tokenType: (d.data().tokenType === "EXPO" ? "EXPO" : "FCM") as PushTokenType }))
    .filter((t) => t.token.length > 0);
}

export async function dropTokens(uid: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const batch = db().batch();
  for (const id of ids) batch.delete(tokens(uid).doc(id));
  await batch.commit();
}
