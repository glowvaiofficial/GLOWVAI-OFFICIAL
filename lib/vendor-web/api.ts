// The one way the vendor page calls /api/vendor/*. Same origin, Bearer Firebase ID token, JSON in and out.
// A 401 gets one retry with a freshly issued token. Every failure becomes a VendorApiError with a friendly message.

import { VendorApiError, friendlyMessage, NETWORK_MESSAGE } from "./errors";
import { vendorAuth } from "./firebase";

export type VendorMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const API_BASE = "/api/vendor";
const TIMEOUT_MS = 20_000;

/**
 * `path` is relative to /api/vendor, with a leading slash: vendorFetch("/me") calls /api/vendor/me.
 * A path that already starts with /api/vendor is used as it is.
 */
function urlFor(path: string): string {
  if (path.startsWith("/api/vendor")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendOnce(url: string, method: VendorMethod, body: unknown, token: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    return await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    // Offline, DNS, CORS or timeout: the same friendly line for all of them.
    throw new VendorApiError(0, "NETWORK", NETWORK_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await res.json();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function codeFor(status: number): string {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "NOT_A_VENDOR_ACCOUNT";
  if (status === 404) return "NOT_FOUND";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 429) return "RATE_LIMITED";
  return "INTERNAL";
}

export async function vendorFetch<T>(path: string, init: { method?: VendorMethod; body?: unknown } = {}): Promise<T> {
  const method: VendorMethod = init.method ?? "GET";
  const url = urlFor(path);
  const auth = vendorAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new VendorApiError(401, "UNAUTHENTICATED", friendlyMessage("UNAUTHENTICATED"));

  let res = await sendOnce(url, method, init.body, await user.getIdToken());
  if (res.status === 401) {
    // The token may have expired between the check and the call: get a fresh one and try once more.
    res = await sendOnce(url, method, init.body, await user.getIdToken(true));
  }

  const body = await readBody(res);
  if (res.ok && body && body.ok === true) return body as T;

  const code = typeof body?.code === "string" && body.code ? body.code : codeFor(res.status);
  const serverText = typeof body?.error === "string" ? body.error : undefined;
  // INVALID_INPUT texts name the exact field and are already plain language, so the server's words are shown as they are.
  const message = code === "INVALID_INPUT" && serverText ? serverText.slice(0, 300) : friendlyMessage(code, serverText);
  const details: Record<string, unknown> = {};
  if (body) for (const [k, v] of Object.entries(body)) if (k !== "ok" && k !== "error" && k !== "code") details[k] = v;
  throw new VendorApiError(res.status, code, message, details);
}
