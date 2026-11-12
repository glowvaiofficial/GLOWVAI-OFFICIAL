// Vendor requests for products that are not in the GlowVai catalogue. Pure functions: validation, the status enum the
// admin team works from, the vendor's view of a request, and the daily cap. The Firestore writes live in the route.
//
// Document: productRequests/{id}, written only by POST /api/vendor/product-requests. Staff review it in the admin panel
// and set `status` and `staffNote`. Fields the vendor app reads back: id, name, brand, category, mrp, barcode,
// pictureUrls, reason, status, staffNote, createdAt, updatedAt. Internal fields (vendorUid, dayKey) never leave here.
import { STORE_CATEGORIES, type Result, type StoreCategory } from "./validation";
import { scrubContact } from "./orders";

/** Status the admin team sets. PENDING is the state of a new request. NEEDS_INFO asks the vendor for more detail. */
export const PRODUCT_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED", "NEEDS_INFO"] as const;
export type ProductRequestStatus = (typeof PRODUCT_REQUEST_STATUSES)[number];

/** Hosts a picture URL may use. Exact host match, https only, no credentials, default port only. */
export const PICTURE_HOSTS = ["images.unsplash.com", "firebasestorage.googleapis.com", "storage.googleapis.com"] as const;
export const MAX_PICTURES = 3;
export const DAILY_REQUEST_CAP = 5;
export const MAX_REQUEST_MRP = 1_000_000;
const PICTURE_URL_MAX = 500;

export interface ProductRequestInput {
  name: string;
  brand: string;
  category: StoreCategory;
  mrp: number;
  barcode: string | null;
  pictureUrls: string[];
  reason: string;
}

const fail = (field: string, error: string): { ok: false; error: string; field: string } => ({ ok: false, error, field });
const clean = (v: unknown): string => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

/** True only for an https URL on one of PICTURE_HOSTS, with no credentials and no non-default port. */
export function pictureUrlAllowed(raw: string): boolean {
  if (raw.length > PICTURE_URL_MAX) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port) return false;
  return (PICTURE_HOSTS as readonly string[]).includes(url.hostname.toLowerCase());
}

export function parseProductRequest(body: unknown): Result<ProductRequestInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("body", "Send the product details.");
  const b = body as Record<string, unknown>;

  const name = clean(b.name);
  if (name.length < 2 || name.length > 120) return fail("name", "The product name must be 2 to 120 characters.");
  const brand = clean(b.brand);
  if (brand.length < 2 || brand.length > 80) return fail("brand", "The brand must be 2 to 80 characters.");

  const category = typeof b.category === "string" ? b.category.trim().toLowerCase() : "";
  if (!(STORE_CATEGORIES as readonly string[]).includes(category)) return fail("category", "Choose the category this product belongs to.");

  const mrp = b.mrp;
  if (typeof mrp !== "number" || !Number.isInteger(mrp) || mrp < 1 || mrp > MAX_REQUEST_MRP) {
    return fail("mrp", `The MRP must be a whole rupee amount from 1 to ${MAX_REQUEST_MRP}.`);
  }

  let barcode: string | null = null;
  if (b.barcode !== undefined && b.barcode !== null && b.barcode !== "") {
    const code = typeof b.barcode === "string" ? b.barcode.trim() : "";
    if (!/^\d{8,14}$/.test(code)) return fail("barcode", "The barcode must be 8 to 14 digits, or leave it empty.");
    barcode = code;
  }

  const pictureUrls: string[] = [];
  if (b.pictureUrls !== undefined && b.pictureUrls !== null) {
    if (!Array.isArray(b.pictureUrls)) return fail("pictureUrls", "Pictures must be a list of web addresses.");
    if (b.pictureUrls.length > MAX_PICTURES) return fail("pictureUrls", `Add up to ${MAX_PICTURES} pictures.`);
    for (const raw of b.pictureUrls) {
      const url = typeof raw === "string" ? raw.trim() : "";
      if (!pictureUrlAllowed(url)) return fail("pictureUrls", "Pictures must be https links from an image host GlowVai accepts.");
      if (!pictureUrls.includes(url)) pictureUrls.push(url);
    }
  }

  const reason = clean(b.reason);
  if (reason.length < 10 || reason.length > 500) return fail("reason", "Tell us why this product should be added, in 10 to 500 characters.");

  return { ok: true, value: { name, brand, category: category as StoreCategory, mrp, barcode, pictureUrls, reason } };
}

/** The status a request is shown with. Anything the admin team sets outside the enum is shown as PENDING. */
export function normaliseStatus(v: unknown): ProductRequestStatus {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  return (PRODUCT_REQUEST_STATUSES as readonly string[]).includes(s) ? (s as ProductRequestStatus) : "PENDING";
}

const msOf = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export interface ProductRequestView {
  id: string;
  name: string;
  brand: string;
  category: string;
  mrp: number;
  barcode: string | null;
  pictureUrls: string[];
  reason: string;
  status: ProductRequestStatus;
  staffNote: string | null;
  createdAt: number;
  updatedAt: number;
}

/** The vendor's view of one request: an allow-list of fields. The staff note is scrubbed of contact details. */
export function toRequestView(id: string, d: Record<string, unknown>): ProductRequestView {
  const note = typeof d.staffNote === "string" ? scrubContact(d.staffNote.trim()) : "";
  return {
    id: typeof d.id === "string" ? d.id : id,
    name: clean(d.name),
    brand: clean(d.brand),
    category: typeof d.category === "string" ? d.category : "",
    mrp: msOf(d.mrp),
    barcode: typeof d.barcode === "string" && d.barcode ? d.barcode : null,
    pictureUrls: Array.isArray(d.pictureUrls) ? d.pictureUrls.filter((u): u is string => typeof u === "string") : [],
    reason: typeof d.reason === "string" ? d.reason : "",
    status: normaliseStatus(d.status),
    staffNote: note || null,
    createdAt: msOf(d.createdAt),
    updatedAt: msOf(d.updatedAt),
  };
}

/** Newest first. */
export const byNewestRequest = (a: ProductRequestView, b: ProductRequestView) => b.createdAt - a.createdAt;

/** IST calendar day (UTC+05:30) of a timestamp, as YYYY-MM-DD. The daily cap resets at IST midnight. */
export function istDayKey(ms: number): string {
  return new Date(Math.floor((ms + 5.5 * 3_600_000) / 86_400_000) * 86_400_000).toISOString().slice(0, 10);
}

/** Whether one more request fits today, given how many were already sent today. */
export const dailyRequestAllowed = (sentToday: number): boolean => sentToday < DAILY_REQUEST_CAP;
