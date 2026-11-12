// The decision flow behind notifyCustomer, with every side effect passed in. No server imports, so the tests can run
// it with fakes. lib/shop/notify.ts supplies the real Firestore and FCM functions.
import { pushDecision, pushDataFor, type NotificationPrefs, type PushTokenType } from "./policy";
import { isRelatedId, renderNotification, type RenderedNotification } from "./templates";

export interface NotifyEvent {
  // One of NOTIFICATION_TYPES in templates.ts.
  type: string;
  // The order, review or other document the event is about. Optional; ignored unless it is a plain id.
  relatedId?: string | null;
}

export type PushOutcome = "sent" | "skipped" | "not-configured" | "no-tokens" | "failed";

export interface NotifyResult {
  // True when the in-app notification was written. The push outcome is reported separately.
  inApp: boolean;
  push: PushOutcome;
  // Why a push was skipped (preference, consent or quiet hours), for logs and tests.
  reason?: string;
}

export interface SendReport {
  sent: number;
  failed: number;
  // Indexes into the tokens array that FCM reported as no longer valid.
  invalidIndexes: number[];
}

export interface NotifyDeps {
  now(): number;
  writeInApp(uid: string, rendered: RenderedNotification, relatedId: string | null, now: number): Promise<string>;
  prefsFor(uid: string): Promise<{ prefs: NotificationPrefs; marketingConsent: boolean }>;
  pushConfigured(): boolean;
  tokensFor(uid: string): Promise<{ id: string; token: string; tokenType?: PushTokenType }[]>;
  // tokenTypes lines up with tokens by index. A missing entry means FCM.
  send(tokens: string[], data: Record<string, string>, tokenTypes?: PushTokenType[]): Promise<SendReport>;
  dropTokens(uid: string, ids: string[]): Promise<void>;
  // Logs a short message and plain details. Never called with a uid, token, name or address.
  log(message: string, detail: Record<string, string | number | boolean>): void;
}

const UID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

const errorCode = (err: unknown): string => {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" || typeof code === "number" ? String(code) : "unknown";
};

// Writes the in-app notification, then sends a push if the customer's preferences, consent and quiet hours allow it.
// Never throws: every failure is logged (type and error code only) and reported in the result.
export async function notifyCustomerWith(deps: NotifyDeps, uid: string, event: NotifyEvent): Promise<NotifyResult> {
  const type = String(event?.type ?? "");
  // A logger that fails must not make notifyCustomer throw.
  const log = (message: string, detail: Record<string, string | number | boolean>) => {
    try {
      deps.log(message, detail);
    } catch {
      // Dropped: logging is best effort.
    }
  };
  try {
    if (typeof uid !== "string" || !UID_PATTERN.test(uid)) {
      log("notify skipped: bad customer id", { type });
      return { inApp: false, push: "failed", reason: "bad-uid" };
    }
    const rendered = renderNotification(type);
    if (!rendered) {
      log("notify skipped: unknown event type", { type });
      return { inApp: false, push: "failed", reason: "unknown-type" };
    }
    const relatedId = isRelatedId(event.relatedId) ? event.relatedId : null;
    if (event.relatedId && !relatedId) log("related id dropped: not a plain id", { type });

    const now = deps.now();
    let inApp = false;
    try {
      await deps.writeInApp(uid, rendered, relatedId, now);
      inApp = true;
    } catch (err) {
      log("in-app write failed", { type, code: errorCode(err) });
    }

    const { prefs, marketingConsent } = await deps.prefsFor(uid);
    const decision = pushDecision({ category: rendered.category, prefs, marketingConsent, nowMs: now });
    if (!decision.send) return { inApp, push: "skipped", reason: decision.reason };
    if (!deps.pushConfigured()) return { inApp, push: "not-configured" };

    const tokens = await deps.tokensFor(uid);
    if (tokens.length === 0) return { inApp, push: "no-tokens" };

    const report = await deps.send(
      tokens.map((t) => t.token),
      pushDataFor(rendered, relatedId),
      tokens.map((t) => t.tokenType ?? "FCM"),
    );
    const dropped = report.invalidIndexes.map((i) => tokens[i]?.id).filter((id): id is string => Boolean(id));
    if (dropped.length > 0) await deps.dropTokens(uid, dropped);
    log("push sent", { type, sent: report.sent, failed: report.failed, dropped: dropped.length });
    return { inApp, push: "sent" };
  } catch (err) {
    log("notify failed", { type, code: errorCode(err) });
    return { inApp: false, push: "failed", reason: "error" };
  }
}
