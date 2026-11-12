// Pure helpers for pushes to Expo push tokens (the GlowVai customer app). No network and no server imports here: the
// sender in lib/shop/notify.ts does the HTTP call; these functions build the request and read the answer.
//
// Expo tokens look like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx] (ExpoPushToken[...] on newer SDKs).

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo accepts up to 100 messages in one request.
export const EXPO_CHUNK_SIZE = 100;
// The Android channel the customer app creates for order updates (see features/notifications/pushRules.ts in the app).
export const EXPO_CHANNEL_ID = "order-updates";

export const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;

export const isExpoToken = (value: unknown): value is string => typeof value === "string" && EXPO_TOKEN_PATTERN.test(value);

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  priority: "high";
  channelId: string;
}

// One message per token. The title and body are shown by the phone; the data carries the link for a tap.
export function buildExpoMessages(tokens: string[], data: Record<string, string>): ExpoMessage[] {
  return tokens.map((to) => ({
    to,
    title: data.title ?? "",
    body: data.body ?? "",
    data,
    priority: "high",
    channelId: EXPO_CHANNEL_ID,
  }));
}

export function chunkIndexes(count: number, size = EXPO_CHUNK_SIZE): number[][] {
  const out: number[][] = [];
  for (let start = 0; start < count; start += size) {
    const end = Math.min(count, start + size);
    out.push(Array.from({ length: end - start }, (_, k) => start + k));
  }
  return out;
}

export interface ExpoReport {
  sent: number;
  failed: number;
  // Positions (0-based, within the request) whose token Expo says no longer exists.
  invalidIndexes: number[];
}

// Reads Expo's answer: one ticket per message, in order. A malformed answer counts every message as failed.
export function expoReport(answer: unknown, count: number): ExpoReport {
  const tickets = (answer as { data?: unknown } | null)?.data;
  if (!Array.isArray(tickets) || tickets.length !== count) {
    return { sent: 0, failed: count, invalidIndexes: [] };
  }
  const report: ExpoReport = { sent: 0, failed: 0, invalidIndexes: [] };
  tickets.forEach((ticket, i) => {
    const t = ticket as { status?: unknown; details?: { error?: unknown } } | null;
    if (t?.status === "ok") report.sent += 1;
    else {
      report.failed += 1;
      if (t?.details?.error === "DeviceNotRegistered") report.invalidIndexes.push(i);
    }
  });
  return report;
}
