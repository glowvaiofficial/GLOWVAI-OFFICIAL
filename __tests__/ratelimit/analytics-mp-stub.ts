// Test-only stand-in for lib/analytics/mp. Records calls; nothing is sent to Google Analytics.
export const sent: unknown[] = [];

export async function sendServerGA4Purchase(event: unknown): Promise<void> {
  sent.push({ purchase: event });
}

export async function sendServerGA4Refund(event: unknown): Promise<void> {
  sent.push({ refund: event });
}
