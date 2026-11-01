import { env } from "@/lib/env";
import { GA4Item } from "@/config/analytics-events";

/**
 * GLOW VAI GA4 Server-Side Measurement Protocol Integration.
 * Sends validated purchase and refund events to Google Analytics 4.
 * Fired strictly from server API endpoints upon order status verification.
 */

export interface MPEventPayload {
  clientId: string;
  sessionId?: string;
  transactionId: string;
  value: number;
  currency?: "INR";
  items: GA4Item[];
  analyticsConsent?: string; // "yes" or "no"
}

export async function sendServerGA4Purchase(payload: MPEventPayload): Promise<{ ok: boolean; error?: string }> {
  const { clientId, sessionId, transactionId, value, currency = "INR", items, analyticsConsent } = payload;

  if (analyticsConsent === "no" || !clientId || clientId.trim() === "") {
    return { ok: true }; // Skipped silently: consent not granted or client ID missing
  }

  const gaId = env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GA_ID;
  const apiSecret = env.GA_API_SECRET || process.env.GA_API_SECRET;

  if (!gaId || !apiSecret || gaId === "G-XXXXXXXXXX") {
    console.log(`[GA4 MP MOCK]: Purchase event for transaction ${transactionId} (Value: ₹${value}) mocked.`);
    return { ok: true };
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

  const requestBody = {
    client_id: clientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: transactionId,
          value,
          currency,
          session_id: sessionId || undefined,
          engagement_time_msec: 1,
          items: items.map((item) => ({
            item_id: item.item_id,
            item_name: item.item_name,
            item_brand: item.item_brand || "GLOW VAI",
            item_category: item.item_category || "Skincare",
            price: item.price || 0,
            quantity: item.quantity || 1,
            currency: item.currency || currency,
          })),
        },
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, error: `GA4 MP HTTP ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Measurement Protocol network error";
    return { ok: false, error: msg };
  }
}

export async function sendServerGA4Refund(payload: MPEventPayload): Promise<{ ok: boolean; error?: string }> {
  const { clientId, transactionId, value, currency = "INR", items, analyticsConsent } = payload;

  if (analyticsConsent === "no" || !clientId || clientId.trim() === "") {
    return { ok: true };
  }

  const gaId = env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GA_ID;
  const apiSecret = env.GA_API_SECRET || process.env.GA_API_SECRET;

  if (!gaId || !apiSecret || gaId === "G-XXXXXXXXXX") {
    console.log(`[GA4 MP MOCK]: Refund event for transaction ${transactionId} (Value: ₹${value}) mocked.`);
    return { ok: true };
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

  const requestBody = {
    client_id: clientId,
    events: [
      {
        name: "refund",
        params: {
          transaction_id: transactionId,
          value,
          currency,
          items: items.map((item) => ({
            item_id: item.item_id,
            item_name: item.item_name,
            price: item.price || 0,
            quantity: item.quantity || 1,
          })),
        },
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    return { ok: res.ok };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Measurement Protocol network error";
    return { ok: false, error: msg };
  }
}
