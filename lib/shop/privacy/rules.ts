// Privacy centre rules: the customer's data export, consent choices, the account deletion request state machine, and
// the device list. Pure functions only (no server imports), so the tests run them directly. The Firestore reads and
// writes that use them live in store.ts.
import { createHash } from "node:crypto";

type Doc = Record<string, unknown>;

// ---------- Masking ----------

// "priya@example.com" -> "p***@example.com". Anything without an @ is fully hidden.
export function maskEmail(email: unknown): string {
  if (typeof email !== "string" || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

// "9876543210" -> "+91 ******3210". Only the last four digits stay visible.
export function maskPhone(phone: unknown): string {
  const digits = typeof phone === "string" ? phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "") : "";
  if (digits.length < 4) return "";
  return `+91 ${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

// ---------- Account deletion request ----------

export type DeletionStatus = "REQUESTED" | "CANCELLED" | "PROCESSING" | "COMPLETED";
export type DeletionAction = "request" | "cancel" | "start" | "complete";

// The process and its timing, exactly as the privacy policy states them (app/privacy). Do not change one without the other.
export const DELETION_TIMING = {
  acknowledgeWithin: "48 hours",
  resolveWithin: "7 business days",
} as const;

// The transitions. A customer can cancel only while the request is still REQUESTED (before the GlowVai team starts it).
// Starting and completing are run by the admin process, not by the customer routes.
export function nextDeletionStatus(
  current: DeletionStatus | null,
  action: DeletionAction,
): { ok: true; status: DeletionStatus } | { ok: false; code: "ALREADY_REQUESTED" | "NOT_CANCELLABLE" | "INVALID_TRANSITION" } {
  switch (action) {
    case "request":
      if (current === null || current === "CANCELLED") return { ok: true, status: "REQUESTED" };
      return { ok: false, code: "ALREADY_REQUESTED" };
    case "cancel":
      if (current === "REQUESTED") return { ok: true, status: "CANCELLED" };
      return { ok: false, code: "NOT_CANCELLABLE" };
    case "start":
      if (current === "REQUESTED") return { ok: true, status: "PROCESSING" };
      return { ok: false, code: "INVALID_TRANSITION" };
    case "complete":
      if (current === "PROCESSING") return { ok: true, status: "COMPLETED" };
      return { ok: false, code: "INVALID_TRANSITION" };
  }
}

// A request that is still open (the customer may cancel it, or the team is working on it).
export const isOpenDeletion = (s: DeletionStatus | null | undefined): boolean => s === "REQUESTED" || s === "PROCESSING";

// ---------- Consent ----------

export interface ConsentState {
  marketing: boolean;
  analytics: boolean;
  marketingUpdatedAt: number | null;
  analyticsUpdatedAt: number | null;
}

// Reads the consent fields the profile stores (users/{uid}.consents). A missing value is "no".
export function consentFrom(consents: unknown): ConsentState {
  const c = (consents && typeof consents === "object" ? consents : {}) as Doc;
  const at = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    marketing: c.marketing === true,
    analytics: c.analytics === true,
    marketingUpdatedAt: at(c.marketingUpdatedAt),
    analyticsUpdatedAt: at(c.analyticsUpdatedAt),
  };
}

// Applies the choices the customer changed. Only a value that really changes gets a new date, so the dates always show
// when each choice was last changed. Withdrawing marketing also turns off the offers notifications.
export function applyConsentChanges(
  current: ConsentState,
  changes: { marketing?: boolean; analytics?: boolean },
  now: number,
): { next: ConsentState; changed: Array<"marketing" | "analytics"> } {
  const next = { ...current };
  const changed: Array<"marketing" | "analytics"> = [];
  if (typeof changes.marketing === "boolean" && changes.marketing !== current.marketing) {
    next.marketing = changes.marketing;
    next.marketingUpdatedAt = now;
    changed.push("marketing");
  }
  if (typeof changes.analytics === "boolean" && changes.analytics !== current.analytics) {
    next.analytics = changes.analytics;
    next.analyticsUpdatedAt = now;
    changed.push("analytics");
  }
  return { next, changed };
}

export function parseConsentBody(body: unknown): { ok: true; changes: { marketing?: boolean; analytics?: boolean } } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request." };
  const b = body as Doc;
  const changes: { marketing?: boolean; analytics?: boolean } = {};
  for (const key of ["marketing", "analytics"] as const) {
    if (b[key] === undefined) continue;
    if (typeof b[key] !== "boolean") return { ok: false, error: "Each choice must be on or off." };
    changes[key] = b[key] as boolean;
  }
  if (Object.keys(changes).length === 0) return { ok: false, error: "Choose marketing or analytics to change." };
  return { ok: true, changes };
}

// ---------- Devices ----------

export const DEVICE_CAP = 10;
// A device's "last seen" time is written at most this often, so an active session does not write on every request.
export const SIGHTING_MIN_GAP_MS = 10 * 60 * 1000;

export const isDeviceId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v);

// The stored device key: a SHA-256 of the account's uid and the client's device id. The uid is the salt, so the same
// device id gives different keys on different accounts, and the raw device id is never stored.
export function deviceHash(uid: string, deviceId: string): string {
  return createHash("sha256").update(`glowvai-device|${uid}|${deviceId}`).digest("hex");
}

export const isDeviceHash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

// A coarse name such as "Chrome on Android". Browser and system only: never a version number, model or device name.
export function coarseDeviceName(userAgent: unknown): string {
  const ua = typeof userAgent === "string" ? userAgent : "";
  if (!ua) return "Unknown device";
  let browser = "Browser";
  if (/Edg(e|A|iOS)?\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/SamsungBrowser\//.test(ua)) browser = "Samsung Internet";
  else if (/Firefox\/|FxiOS\//.test(ua)) browser = "Firefox";
  else if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let system = "Unknown system";
  if (/iPhone/.test(ua)) system = "iPhone";
  else if (/iPad/.test(ua)) system = "iPad";
  else if (/Android/.test(ua)) system = "Android";
  else if (/Windows/.test(ua)) system = "Windows";
  else if (/Macintosh|Mac OS X/.test(ua)) system = "Mac";
  else if (/CrOS/.test(ua)) system = "ChromeOS";
  else if (/Linux/.test(ua)) system = "Linux";
  return `${browser} on ${system}`.slice(0, 40);
}

export interface KnownDevice {
  hash: string;
  firstSeenAt: number;
  lastSeenAt: number;
}

export type SightingPlan =
  | { kind: "none" }
  | { kind: "touch" }
  | { kind: "create"; evict: string[] };

// What a sighting does. A known device is refreshed at most every SIGHTING_MIN_GAP_MS. A new device is added, and when the
// account is already at the cap the least recently seen device(s) are removed first, so the list never passes DEVICE_CAP.
export function planSighting(devices: KnownDevice[], hash: string, now: number): SightingPlan {
  const known = devices.find((d) => d.hash === hash);
  if (known) return now - known.lastSeenAt >= SIGHTING_MIN_GAP_MS ? { kind: "touch" } : { kind: "none" };
  const overflow = devices.length + 1 - DEVICE_CAP;
  if (overflow <= 0) return { kind: "create", evict: [] };
  const oldest = [...devices].sort((a, b) => a.lastSeenAt - b.lastSeenAt || a.firstSeenAt - b.firstSeenAt).slice(0, overflow);
  return { kind: "create", evict: oldest.map((d) => d.hash) };
}

// Most recently seen first, for the list the customer sees.
export const sortDevices = <T extends { lastSeenAt: number }>(devices: T[]): T[] => [...devices].sort((a, b) => b.lastSeenAt - a.lastSeenAt);

// ---------- Daily and windowed limits ----------

export interface WindowCounter {
  count: number;
  windowStart: number;
}

// Counts an attempt in a fixed window. Returns whether it is allowed and the counter to store.
export function countAttempt(
  current: WindowCounter | null,
  now: number,
  max: number,
  windowMs: number,
): { allowed: boolean; next: WindowCounter; retryAfterMs: number } {
  const fresh = !current || now - current.windowStart >= windowMs;
  const base: WindowCounter = fresh ? { count: 0, windowStart: now } : current;
  const next = { count: base.count + 1, windowStart: base.windowStart };
  const allowed = next.count <= max;
  return { allowed, next, retryAfterMs: allowed ? 0 : Math.max(0, base.windowStart + windowMs - now) };
}

// The UTC calendar day, used as the key of a per-day limit.
export const dayKey = (now: number): string => new Date(now).toISOString().slice(0, 10);

// ---------- Data export ----------

export interface ExportInput {
  uid: string;
  now: number;
  profile: Doc | null;
  addresses: Doc[];
  orders: Doc[];
  reviews: Doc[];
  wishlist: string[];
  subscriptions: Doc[];
  activity: Doc[];
  tickets: Doc[];
}

// A timestamp as ISO text. Accepts milliseconds, a Firestore-style object with toDate(), or ISO text.
export function isoOf(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
  const t = v as { toDate?: () => Date } | null;
  if (t && typeof t.toDate === "function") return t.toDate().toISOString();
  return null;
}

const str = (v: unknown, max = 500): string => (typeof v === "string" ? v.slice(0, max) : "");

// Each section copies only the fields listed here. Internal fields (staff notes, risk and fraud flags, roles, the admin
// overlay, owners, priorities, SLA dates, internal ticket notes and staff-only messages) are never copied, so a new
// field added to a record later stays out of the export until it is listed here on purpose.
export function buildExport(input: ExportInput): Doc {
  const p = input.profile ?? {};
  const consents = consentFrom(p.consents);
  const address = (a: Doc) => ({
    label: str(a.label, 20),
    recipientName: str(a.recipientName, 80),
    phone: str(a.phone, 20),
    fullAddress: str(a.fullAddress, 300),
    city: str(a.city, 60),
    pincode: str(a.pincode, 10),
    landmark: str(a.landmark, 120),
    isDefault: a.isDefault === true,
  });
  const order = (o: Doc) => {
    const items = Array.isArray(o.items) ? (o.items as Doc[]) : [];
    const pricing = (o.pricing && typeof o.pricing === "object" ? o.pricing : {}) as Doc;
    return {
      orderId: str(o.orderId ?? o.id, 60),
      placedAt: isoOf(o.createdAt),
      status: str(o.status, 40),
      total: typeof pricing.grandTotal === "number" ? pricing.grandTotal : null,
      itemCount: items.length,
      items: items.slice(0, 50).map((it) => ({
        name: str(it.name ?? it.productName, 160),
        quantity: typeof it.quantity === "number" ? it.quantity : null,
      })),
    };
  };
  const review = (r: Doc) => ({
    productId: str(r.productId, 80),
    rating: typeof r.rating === "number" ? r.rating : null,
    title: str(r.title, 120),
    body: str(r.body, 2000),
    status: str(r.status, 30),
    submittedAt: isoOf(r.createdAtMs ?? r.createdAt),
  });
  const subscription = (s: Doc) => ({
    subscriptionId: str(s.id, 80),
    productId: str(s.productId, 80),
    quantity: typeof s.quantity === "number" ? s.quantity : null,
    intervalWeeks: typeof s.intervalWeeks === "number" ? s.intervalWeeks : null,
    status: str(s.status, 20),
    startedAt: isoOf(s.createdAt),
  });
  const ticket = (t: Doc) => ({
    ticketId: str(t.id, 80),
    subject: str(t.subject, 200),
    category: str(t.category, 60),
    status: str(t.status, 40),
    orderId: str(t.orderId, 60) || null,
    openedAt: isoOf(t.createdAt),
  });
  return {
    exportVersion: 1,
    generatedAt: new Date(input.now).toISOString(),
    account: { uid: input.uid },
    profile: {
      name: str(p.name, 80),
      phone: str(p.phone, 20),
      email: str(p.email, 120),
      address: p.address && typeof p.address === "object" ? { fullAddress: str((p.address as Doc).fullAddress, 300), city: str((p.address as Doc).city, 60), pincode: str((p.address as Doc).pincode, 10), landmark: str((p.address as Doc).landmark, 120) } : null,
      createdAt: isoOf(p.createdAt),
    },
    consents: {
      marketing: consents.marketing,
      marketingUpdatedAt: consents.marketingUpdatedAt ? new Date(consents.marketingUpdatedAt).toISOString() : null,
      analytics: consents.analytics,
      analyticsUpdatedAt: consents.analyticsUpdatedAt ? new Date(consents.analyticsUpdatedAt).toISOString() : null,
    },
    addresses: input.addresses.map(address),
    orders: { count: input.orders.length, items: input.orders.map(order) },
    reviews: input.reviews.map(review),
    wishlist: input.wishlist.map((id) => str(id, 80)),
    subscriptions: input.subscriptions.map(subscription),
    activity: input.activity.map((a) => ({ type: str(a.type, 60), at: isoOf(a.at), detail: str(a.detail, 200) || null })),
    supportTickets: input.tickets.map(ticket),
  };
}
