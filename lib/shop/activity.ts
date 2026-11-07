// The customer's own account activity: users/{uid}/activity, at most ACTIVITY_CAP entries. Server-only, Admin SDK only.
// Entries hold a type and a fixed message, never a personal value. The oldest entries go in the same transaction that
// adds a new one. A failure here is logged without any customer data and never fails the request that caused it.
import "server-only";
import { FieldPath } from "firebase-admin/firestore";
import { db } from "./server";
import {
  ACTIVITY_CAP,
  ACTIVITY_MESSAGES,
  decodeActivityCursor,
  encodeActivityCursor,
  planActivityTrim,
  type ActivityType,
  type ActivityView,
} from "./settings/rules";

const activityCol = (uid: string) => db().collection("users").doc(uid).collection("activity");

export async function recordActivity(uid: string, type: ActivityType, now: number): Promise<void> {
  try {
    const col = activityCol(uid);
    const ref = col.doc();
    await db().runTransaction(async (tx) => {
      // Reads come before writes, as Firestore requires. Only the overflow is read.
      const overflow = await tx.get(col.orderBy("createdAt", "desc").offset(ACTIVITY_CAP - 1).limit(200));
      const drop = planActivityTrim(overflow.docs.map((d) => ({ id: d.id, createdAt: Number(d.data().createdAt) || 0 })));
      for (const id of drop) tx.delete(col.doc(id));
      tx.create(ref, { type, message: ACTIVITY_MESSAGES[type], createdAt: now });
    });
  } catch {
    // No uid, type or message in the log line: a failed write must not leak customer data.
    console.error("activity: could not record an entry");
  }
}

// One page, newest first. The cursor is the last entry of the previous page.
export async function listActivity(uid: string, limit: number, cursor: string | null): Promise<{ items: ActivityView[]; nextCursor: string | null } | null> {
  const after = cursor === null ? null : decodeActivityCursor(cursor);
  if (cursor !== null && !after) return null;
  let query = activityCol(uid).orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(limit + 1);
  if (after) query = query.startAfter(after.createdAt, after.id);
  const snap = await query.get();
  const pageDocs = snap.docs.slice(0, limit);
  const items: ActivityView[] = pageDocs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type as ActivityType,
      message: String(data.message ?? ""),
      createdAt: Number(data.createdAt) || 0,
    };
  });
  const last = items[items.length - 1];
  const nextCursor = snap.docs.length > limit && last ? encodeActivityCursor(last.createdAt, last.id) : null;
  return { items, nextCursor };
}
