import { env } from "@/lib/env";

/**
 * GLOW VAI Direct Resend API Client.
 * Connects directly to https://api.resend.com/emails with exponential backoff retries.
 */

export interface ResendSendPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
  relatedId?: string;
  headers?: Record<string, string>;
}

export interface ResendResponse {
  ok: boolean;
  id?: string;
  error?: string;
  statusCode?: number;
}

export async function sendViaResendApi(payload: ResendSendPayload): Promise<ResendResponse> {
  const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "re_123456789_abcdefg") {
    // Development / Test mode fallback
    const mockId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[RESEND DEV MOCK SEND]: Template send triggered to ${payload.to}. Mock ID: ${mockId}`);
    return { ok: true, id: mockId };
  }

  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (payload.idempotencyKey) {
    headers["Idempotency-Key"] = payload.idempotencyKey;
  }

  const customHeaders: Record<string, string> = { ...payload.headers };
  if (payload.relatedId) {
    customHeaders["X-Entity-Ref-ID"] = payload.relatedId;
  }

  const body = {
    from: payload.from,
    to: toAddresses,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    reply_to: payload.replyTo,
    headers: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
  };

  const maxTries = 3;
  let attempt = 0;
  let lastError = "";

  while (attempt < maxTries) {
    attempt++;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({ id: `resend_${Date.now()}` }));
        return { ok: true, id: data.id || `resend_${Date.now()}` };
      }

      const status = res.status;
      const errJson = await res.json().catch(() => ({ message: `HTTP ${status}` }));
      lastError = errJson.message || `HTTP ${status}`;

      if (status === 429 || (status >= 500 && status < 600)) {
        // Exponential backoff: 300ms, 600ms, 1200ms
        const delay = Math.pow(2, attempt) * 150;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // 4xx errors (non-429) should not retry
      return { ok: false, error: lastError, statusCode: status };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error connecting to Resend";
      if (attempt < maxTries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }
  }

  return { ok: false, error: lastError || "Failed after 3 retries" };
}
