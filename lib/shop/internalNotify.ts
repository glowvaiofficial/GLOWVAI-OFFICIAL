// Pure rules for POST /api/shop/internal/notify: the body check and the idempotency flow. No server imports, so the
// tests can run the flow with fakes. The route supplies the Firestore claim store and the real notifyCustomer.
import { createHash } from "node:crypto";
import { isNotificationType, isRelatedId, type NotificationType } from "./notifications/templates";
import type { NotifyEvent, NotifyResult } from "./notifications/dispatch";

export const INTERNAL_NOTIFY_MAX_BODY = 4096;

export interface InternalNotifyBody {
  uid: string;
  type: NotificationType;
  relatedId: string | null;
}

export function parseInternalNotify(body: unknown): { ok: true; value: InternalNotifyBody } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const uid = typeof b.uid === "string" ? b.uid.trim() : "";
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return { ok: false, error: "uid is missing or invalid." };
  if (!isNotificationType(b.type)) return { ok: false, error: "type is not a known notification type." };
  let relatedId: string | null = null;
  if (b.relatedId !== undefined && b.relatedId !== null) {
    if (!isRelatedId(b.relatedId)) return { ok: false, error: "relatedId must be a plain id (letters, digits, - and _)." };
    relatedId = b.relatedId;
  }
  return { ok: true, value: { uid, type: b.type, relatedId } };
}

// One claim per (uid, type, relatedId). The id is a hash so no raw id is used as a document name.
export function notifyClaimId(uid: string, type: string, relatedId: string | null): string {
  return createHash("sha256").update(`${uid}\n${type}\n${relatedId ?? ""}`, "utf8").digest("hex");
}

export interface ClaimStore {
  // True when this call made the claim; false when the same event was already claimed.
  claim(uid: string, claimId: string): Promise<boolean>;
  release(uid: string, claimId: string): Promise<void>;
}

export type NotifyOnceOutcome = { duplicate: true } | { duplicate: false; result: NotifyResult };

// Sends the event once. A repeat call for the same (uid, type, relatedId) changes nothing. If the in-app notification
// could not be written, the claim is released so a retry can send it.
export async function notifyOnce(
  store: ClaimStore,
  notify: (uid: string, event: NotifyEvent) => Promise<NotifyResult>,
  body: InternalNotifyBody,
): Promise<NotifyOnceOutcome> {
  const claimId = notifyClaimId(body.uid, body.type, body.relatedId);
  const first = await store.claim(body.uid, claimId);
  if (!first) return { duplicate: true };
  const result = await notify(body.uid, { type: body.type, relatedId: body.relatedId });
  if (!result.inApp) await store.release(body.uid, claimId);
  return { duplicate: false, result };
}
