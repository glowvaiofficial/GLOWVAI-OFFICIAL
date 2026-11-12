// URL checks for the channel link (affiliates) and the seller entry (VENDOR_APPLY_URL). Only http and https are accepted;
// javascript:, data:, file: and anything else are refused. Link shorteners are refused too, because the destination of a
// shortened link cannot be checked. Pure, so the browser form and the server apply the same rule.
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc", "lnkd.in", "fb.me"];

export type UrlCheck = { ok: true; url: string | null } | { ok: false; error: string };

export function validateUrl(value: unknown, options: { httpsOnly?: boolean; maxLength?: number } = {}): UrlCheck {
  if (value === undefined || value === null) return { ok: true, url: null };
  if (typeof value !== "string") return { ok: false, error: "Enter a web address that starts with https://." };
  const raw = value.trim();
  if (!raw) return { ok: true, url: null };
  if (raw.length > (options.maxLength ?? 300)) return { ok: false, error: "That web address is too long." };
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) return { ok: false, error: "The web address cannot contain spaces." };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Enter a full web address, for example https://www.example.com/yourpage." };
  }
  const allowed = options.httpsOnly ? ["https:"] : ["https:", "http:"];
  if (!allowed.includes(parsed.protocol)) return { ok: false, error: "Only web addresses (https://) are accepted." };
  if (parsed.username || parsed.password) return { ok: false, error: "Remove the login details from the web address." };
  const host = parsed.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost") return { ok: false, error: "Enter a public web address." };
  if (SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) {
    return { ok: false, error: "Short links are not accepted. Use the full address of your page or profile." };
  }
  return { ok: true, url: parsed.toString() };
}

// For display: the stored URL when it still passes the rule, otherwise null. Output is never built from raw input.
export function safeHttpUrl(value: unknown): string | null {
  const checked = validateUrl(value);
  return checked.ok && checked.url ? checked.url : null;
}
