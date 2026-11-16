// httpSMS client (https://httpsms.com): an Android phone with the app is the SMS gateway.
// POST {base}/v1/messages/send, header x-api-key, JSON {content, from, to}. Never logs the message or the number.
export interface HttpSmsConfig {
  apiKey: string;
  from: string;
  baseUrl: string;
}

export type SmsFailure = "unauthorized" | "rejected" | "unavailable" | "timeout";
export type SmsResult = { ok: true } | { ok: false; reason: SmsFailure };

export const HTTPSMS_TIMEOUT_MS = 8000;

export function httpSmsConfig(env: Record<string, string | undefined> = process.env): HttpSmsConfig | null {
  const apiKey = env.HTTPSMS_API_KEY?.trim();
  const from = env.HTTPSMS_FROM?.trim();
  if (!apiKey || !from) return null;
  const baseUrl = (env.HTTPSMS_BASE_URL?.trim() || "https://api.httpsms.com").replace(/\/+$/, "");
  return { apiKey, from, baseUrl };
}

export function mapStatus(status: number): SmsFailure {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 400 || status === 422) return "rejected";
  return "unavailable";
}

export async function sendSms(
  cfg: HttpSmsConfig,
  to: string,
  content: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = HTTPSMS_TIMEOUT_MS,
): Promise<SmsResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);
  try {
    const res = await fetchImpl(`${cfg.baseUrl}/v1/messages/send`, {
      method: "POST",
      headers: { "x-api-key": cfg.apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ content, from: cfg.from, to }),
      signal: ctl.signal,
    });
    return res.ok ? { ok: true } : { ok: false, reason: mapStatus(res.status) };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    return { ok: false, reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
