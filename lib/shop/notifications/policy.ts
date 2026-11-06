// Pure rules for customer notifications: token hashing and the token cap, the per-user cap on in-app notifications,
// preferences and quiet hours, the read-marking plan, paging cursors and the push payload. No server imports.
import { createHash } from "node:crypto";
import type { NotificationCategory, RelatedType, RenderedNotification } from "./templates";

// ---- Push tokens -------------------------------------------------------------------------------------------------

export const MAX_TOKENS_PER_USER = 5;
// FCM registration tokens are long URL-safe strings. Anything shorter or with other characters is refused.
export const TOKEN_PATTERN = /^[A-Za-z0-9:_-]{20,400}$/;

export const isPushToken = (value: unknown): value is string => typeof value === "string" && TOKEN_PATTERN.test(value);

// The Firestore document id for a token: SHA-256 (hex) of the token. The token itself is stored in the document
// because it is needed to send; the id never reveals it.
export function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export interface StoredToken {
  id: string;
  updatedAt: number;
}

export interface TokenSavePlan {
  // True when the token is already registered for this user, so only its timestamp is refreshed.
  alreadyRegistered: boolean;
  // Document ids to delete first, so that saving the new token keeps the user at or below the cap.
  evict: string[];
}

// Saves a token for a user. When the user already has MAX tokens and this one is new, the least recently refreshed
// token goes, so a new device is never refused.
export function planTokenSave(existing: StoredToken[], id: string, max = MAX_TOKENS_PER_USER): TokenSavePlan {
  if (existing.some((t) => t.id === id)) return { alreadyRegistered: true, evict: [] };
  const oldestFirst = [...existing].sort((a, b) => a.updatedAt - b.updatedAt || a.id.localeCompare(b.id));
  const overflow = Math.max(0, existing.length - (max - 1));
  return { alreadyRegistered: false, evict: oldestFirst.slice(0, overflow).map((t) => t.id) };
}

// ---- In-app notifications ----------------------------------------------------------------------------------------

export const MAX_NOTIFICATIONS = 100;

export interface StoredNotification {
  id: string;
  createdAt: number;
}

// Ids to delete before a new notification is written, so that at most `max` remain afterwards. `existing` is every
// stored notification in any order. Keeps the newest max-1 and returns the rest (the oldest).
export function planTrim(existing: StoredNotification[], max = MAX_NOTIFICATIONS): string[] {
  const newestFirst = [...existing].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  return newestFirst.slice(Math.max(0, max - 1)).map((n) => n.id);
}

// What the owner sees for one notification. Times are epoch milliseconds; readAt is null while unread.
export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedType: RelatedType;
  relatedId: string | null;
  createdAt: number;
  readAt: number | null;
}

// ---- Read marking ------------------------------------------------------------------------------------------------

export interface ReadRequest {
  ids?: string[];
  all?: boolean;
}

// Which notifications to mark read. `owned` must be read from the caller's own collection only. Ids the caller asks
// for that are not in `owned` are ignored, so a request can never touch another customer's notification.
export function planMarkRead(owned: { id: string; readAt: unknown }[], request: ReadRequest): string[] {
  const wanted = new Set(request.ids ?? []);
  return owned
    .filter((n) => n.readAt === null || n.readAt === undefined)
    .filter((n) => request.all === true || wanted.has(n.id))
    .map((n) => n.id);
}

export const MAX_READ_IDS = 100;

export function parseReadRequest(body: unknown): ReadRequest | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as { ids?: unknown; all?: unknown };
  if (raw.all === true) return { all: true };
  if (!Array.isArray(raw.ids) || raw.ids.length === 0 || raw.ids.length > MAX_READ_IDS) return null;
  const ids = raw.ids.filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{1,140}$/.test(id));
  if (ids.length !== raw.ids.length) return null;
  return { ids: [...new Set(ids)] };
}

// ---- Paging ------------------------------------------------------------------------------------------------------

export const PAGE_SIZE = 30;

// Cursor = "<createdAt>_<id>" of the last item of a page. Opaque to the app; the server checks it.
export function encodeCursor(createdAt: number, id: string): string {
  return `${createdAt}_${id}`;
}

export function decodeCursor(value: string | null): { createdAt: number; id: string } | null {
  if (!value) return null;
  const match = /^(\d{1,15})_([A-Za-z0-9_-]{1,140})$/.exec(value);
  if (!match) return null;
  return { createdAt: Number(match[1]), id: match[2] };
}

export function pageLimit(raw: string | null): number {
  const n = Math.floor(Number(raw ?? PAGE_SIZE));
  if (!Number.isFinite(n) || n < 1) return PAGE_SIZE;
  return Math.min(n, PAGE_SIZE);
}

// ---- Preferences and quiet hours ---------------------------------------------------------------------------------

export interface NotificationPrefs {
  orders: boolean;
  offers: boolean;
  reviews: boolean;
}

// Orders and reviews are on by default. Offers are off: marketing needs an explicit choice.
export const DEFAULT_PREFS: Readonly<NotificationPrefs> = { orders: true, offers: false, reviews: true };

// Reads users/{uid}.notificationPrefs. Anything that is not a boolean falls back to the default.
export function prefsFrom(raw: unknown): NotificationPrefs {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pick = (key: keyof NotificationPrefs) => (typeof source[key] === "boolean" ? (source[key] as boolean) : DEFAULT_PREFS[key]);
  return { orders: pick("orders"), offers: pick("offers"), reviews: pick("reviews") };
}

// Quiet hours for pushes, in India time: from 22:00 until 08:00. A push that falls inside is not sent. The in-app
// notification is still written, so nothing is lost.
export const QUIET_HOURS = { startHour: 22, endHour: 8 } as const;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function isQuietHour(nowMs: number): boolean {
  const hour = new Date(nowMs + IST_OFFSET_MS).getUTCHours();
  return hour >= QUIET_HOURS.startHour || hour < QUIET_HOURS.endHour;
}

export type PushSkip = "preference-off" | "no-marketing-consent" | "quiet-hours";

export interface PushInput {
  category: NotificationCategory;
  prefs: NotificationPrefs;
  // consents.marketing on users/{uid}. Only an explicit true counts.
  marketingConsent: boolean;
  nowMs: number;
}

// Decides whether a push may be sent. The in-app notification never goes through this check.
export function pushDecision(input: PushInput): { send: true } | { send: false; reason: PushSkip } {
  if (!input.prefs[input.category]) return { send: false, reason: "preference-off" };
  if (input.category === "offers" && input.marketingConsent !== true) return { send: false, reason: "no-marketing-consent" };
  if (isQuietHour(input.nowMs)) return { send: false, reason: "quiet-hours" };
  return { send: true };
}

// ---- Push payload ------------------------------------------------------------------------------------------------

// Where a tap on the notification goes. Only paths inside the shop; the service worker checks this again.
export function linkFor(relatedType: RelatedType, relatedId: string | null): string {
  if (relatedType === "order" && relatedId && /^[A-Za-z0-9_-]{1,140}$/.test(relatedId)) return `/shop?order=${relatedId}`;
  return "/shop?inbox=1";
}

// A data-only message: the service worker builds the visible notification, so the browser never shows a second one.
// Only fixed copy, the type and the related id go in. No name, phone, address, amount or token.
export function pushDataFor(rendered: RenderedNotification, relatedId: string | null): Record<string, string> {
  return {
    type: rendered.type,
    title: rendered.title,
    body: rendered.body,
    relatedType: rendered.relatedType,
    relatedId: relatedId ?? "",
    link: linkFor(rendered.relatedType, relatedId),
  };
}
