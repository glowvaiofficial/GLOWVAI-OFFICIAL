// The Expo push HTTP call, shared by the customer sender (lib/shop/notify.ts) and the vendor sender (lib/vendor/notify.ts).
// Never throws: a failed request counts its tokens as failed. The pure request and answer rules are in ./expoPush.ts.
import { buildExpoMessages, chunkIndexes, EXPO_PUSH_URL, expoReport } from "./expoPush";

export interface ExpoBatchReport {
  sent: number;
  failed: number;
  // Indexes into the tokens array that Expo reports as no longer registered.
  invalidIndexes: number[];
}

type PostFn = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ json(): Promise<unknown> }>;

export async function sendExpoBatch(
  tokens: string[],
  data: Record<string, string>,
  post: PostFn = (url, init) => fetch(url, init),
): Promise<ExpoBatchReport> {
  let sent = 0;
  let failed = 0;
  const invalidIndexes: number[] = [];
  for (const positions of chunkIndexes(tokens.length)) {
    try {
      const res = await post(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(buildExpoMessages(positions.map((p) => tokens[p]), data)),
        signal: AbortSignal.timeout(10_000),
      });
      const report = expoReport(await res.json().catch(() => null), positions.length);
      sent += report.sent;
      failed += report.failed;
      report.invalidIndexes.forEach((j) => invalidIndexes.push(positions[j]));
    } catch {
      failed += positions.length;
    }
  }
  return { sent, failed, invalidIndexes };
}
