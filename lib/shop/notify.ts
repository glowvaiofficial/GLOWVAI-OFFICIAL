// Tells a customer about something that happened to their order, account or review.
//
// HOW TO USE (for the admin and other teams):
//
//   import { notifyCustomer } from "@/lib/shop/notify";
//   await notifyCustomer(customerUid, { type: "order_delivered", relatedId: orderId });
//
// - customerUid is the Firebase uid of the customer (users/{uid}).
// - type is one of the event types listed below. The copy comes from lib/shop/notifications/templates.ts. Pass no text.
// - relatedId is the order (or review) id, so a tap opens the right page. Optional.
// - It always writes the customer's in-app notification (kept to the newest 100).
// - It sends a push only when all of these hold: VAPID key and Admin messaging are set up, the customer has a
//   registered device, the category is on in users/{uid}.notificationPrefs, the quiet-hours window (22:00-08:00 IST)
//   is not in effect, and for "offers" the customer has marketing consent.
// - It never throws and never rejects. Await it, but do not let it decide the outcome of the action around it.
//   Failures are logged with the event type and an error code only (no uid, token, name or address).
//
// Event types (type value -> what it means):
//   order_placed            an order was placed (cash on delivery, or online payment confirmed)
//   store_accepted          a store accepted the order
//   order_packed            the order was packed
//   out_for_delivery        the order is out for delivery
//   order_delivered         the order was delivered
//   order_cancelled         the order was cancelled
//   payment_failed          an online payment failed
//   refund_processed        a refund was processed
//   return_update           an update on a return request
//   review_approved         a review was approved and published (relatedId = review id)
//   question_answered       a product question was answered (relatedId = question id)
//   referral_reward         a referral reward was earned (offers category)
//   coins_credited          coins were added (offers category)
//   subscription_processed  a subscription was processed (relatedId = subscription id)
import "server-only";
import { notifyCustomerWith, type NotifyDeps, type NotifyEvent, type NotifyResult, type SendReport } from "./notifications/dispatch";
import { buildExpoMessages, chunkIndexes, EXPO_PUSH_URL, expoReport } from "./notifications/expoPush";
import type { PushTokenType } from "./notifications/policy";
import { prefsFor, dropTokens, tokensFor, writeInApp } from "./notifyStore";
import { messaging } from "./server";

export type { NotifyEvent, NotifyResult };

// Codes FCM returns when a token will never work again. Those tokens are removed.
const INVALID_TOKEN_CODES = new Set(["messaging/invalid-registration-token", "messaging/registration-token-not-registered"]);

// Push needs the public VAPID key (set by the owner in the Firebase console) and the Admin SDK credentials.
// Sending needs the Admin SDK credentials (FCM and the Expo sender both run on the server). The VAPID key is only
// needed by the browser to subscribe, so it is not required here.
export const pushConfigured = (): boolean => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

const liveDeps: NotifyDeps = {
  now: () => Date.now(),
  writeInApp,
  prefsFor,
  pushConfigured,
  tokensFor,
  dropTokens,
  async send(tokens: string[], data: Record<string, string>, tokenTypes?: PushTokenType[]): Promise<SendReport> {
    const kinds = tokens.map((_, i) => tokenTypes?.[i] ?? "FCM");
    const fcmIndexes = kinds.flatMap((k, i) => (k === "FCM" ? [i] : []));
    const expoIndexes = kinds.flatMap((k, i) => (k === "EXPO" ? [i] : []));
    let sent = 0;
    let failed = 0;
    const invalidIndexes: number[] = [];

    if (fcmIndexes.length > 0) {
      // Data-only message: the service worker shows it, so the browser never shows a second copy.
      const res = await messaging().sendEachForMulticast({
        tokens: fcmIndexes.map((i) => tokens[i]),
        data,
        webpush: { headers: { Urgency: "normal" } },
      });
      sent += res.successCount;
      failed += res.failureCount;
      res.responses.forEach((r, j) => {
        if (!r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code)) invalidIndexes.push(fcmIndexes[j]);
      });
    }

    // Expo push service (the customer app). One request per 100 tokens; a failed request counts its tokens as failed.
    for (const positions of chunkIndexes(expoIndexes.length)) {
      const indexes = positions.map((p) => expoIndexes[p]);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(buildExpoMessages(indexes.map((i) => tokens[i]), data)),
          signal: AbortSignal.timeout(10_000),
        });
        const report = expoReport(await res.json().catch(() => null), indexes.length);
        sent += report.sent;
        failed += report.failed;
        report.invalidIndexes.forEach((j) => invalidIndexes.push(indexes[j]));
      } catch {
        failed += indexes.length;
      }
    }

    return { sent, failed, invalidIndexes };
  },
  log(message, detail) {
    if (message.includes("failed")) console.error(`[notify] ${message}`, detail);
    else console.info(`[notify] ${message}`, detail);
  },
};

export function notifyCustomer(uid: string, event: NotifyEvent): Promise<NotifyResult> {
  return notifyCustomerWith(liveDeps, uid, event);
}
