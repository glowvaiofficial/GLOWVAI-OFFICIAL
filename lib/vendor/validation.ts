// Input checks for the vendor API. Pure functions: each returns the clean value to store, or a friendly error naming
// the field. Nothing here touches the database.
import { indianMobile, text } from "../shop/text";

export const STORE_CATEGORIES = ["skincare", "haircare", "makeup", "fragrance", "bath-body", "mens-grooming", "wellness"] as const;
export type StoreCategory = (typeof STORE_CATEGORIES)[number];

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const UPI_RE = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;
export const PINCODE_RE = /^[1-9]\d{5}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const ORDER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const PRODUCT_ID_RE = /^[A-Za-z0-9_-]{1,140}$/;

// Rough bounding box of India (mainland and islands).
export const INDIA_BOUNDS = { minLat: 6, maxLat: 37.5, minLng: 68, maxLng: 97.5 };
export const MAX_SERVICE_PINCODES = 20;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; field: string };

const fail = (field: string, error: string): { ok: false; error: string; field: string } => ({ ok: false, error, field });

type Doc = Record<string, unknown>;

export interface ApplicationFields {
  storeName: string;
  ownerName: string;
  contactNumber: string;
  gstNumber?: string;
  businessRegistrationNumber?: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: { latitude: number; longitude: number };
  servicePincodes: string[];
  serviceZoneIds: string[];
  operatingHours: { openTime: string; closeTime: string; isOpenToday: boolean };
  categories: string[];
  panLast4?: string;
  bank?: { holderName: string; bankName: string; ifsc: string; accLast4: string; upiVpa?: string };
}

/** HDFC0001234 -> HDFC0••••34. The full code is never stored. */
export function maskIfscForStorage(ifsc: string): string {
  return `${ifsc.slice(0, 5)}••••${ifsc.slice(-2)}`;
}

function name(v: unknown, field: string, label: string): Result<string> {
  if (typeof v !== "string") return fail(field, `Enter the ${label}.`);
  const s = v.trim().replace(/\s+/g, " ");
  if (s.length < 2 || s.length > 120) return fail(field, `The ${label} must be 2 to 120 characters.`);
  return { ok: true, value: s };
}

const upper = (v: unknown, max: number) => text(v, max).toUpperCase().replace(/\s+/g, "");

export function parseApplication(body: unknown): Result<ApplicationFields> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("body", "Send the application details.");
  const b = body as Doc;

  const storeName = name(b.storeName, "storeName", "store name");
  if (!storeName.ok) return storeName;
  const ownerName = name(b.ownerName, "ownerName", "owner's name");
  if (!ownerName.ok) return ownerName;

  const mobile = indianMobile(b.contactNumber);
  if (!mobile) return fail("contactNumber", "Enter a 10-digit Indian mobile number.");

  const out: ApplicationFields = {
    storeName: storeName.value,
    ownerName: ownerName.value,
    contactNumber: `+91${mobile}`,
    streetAddress: "",
    city: "",
    state: "",
    pincode: "",
    servicePincodes: [],
    serviceZoneIds: [],
    operatingHours: { openTime: "", closeTime: "", isOpenToday: true },
    categories: [],
  };

  if (b.gstNumber !== undefined && b.gstNumber !== null && b.gstNumber !== "") {
    const gst = upper(b.gstNumber, 20);
    if (!GSTIN_RE.test(gst)) return fail("gstNumber", "Enter a valid 15-character GSTIN, or leave it empty.");
    out.gstNumber = gst;
  }
  if (b.businessRegistrationNumber !== undefined && b.businessRegistrationNumber !== null && b.businessRegistrationNumber !== "") {
    const reg = text(b.businessRegistrationNumber, 41);
    if (!/^[A-Za-z0-9][A-Za-z0-9 /.-]{2,39}$/.test(reg)) {
      return fail("businessRegistrationNumber", "The registration number must be 3 to 40 letters, digits, spaces, / . or -.");
    }
    out.businessRegistrationNumber = reg;
  }

  const street = text(b.streetAddress, 301);
  if (street.length < 5 || street.length > 300) return fail("streetAddress", "Enter the store's street address (5 to 300 characters).");
  out.streetAddress = street;
  const city = text(b.city, 81);
  if (city.length < 2 || city.length > 80) return fail("city", "Enter the city.");
  out.city = city;
  const state = text(b.state, 81);
  if (state.length < 2 || state.length > 80) return fail("state", "Enter the state.");
  out.state = state;
  const pincode = text(b.pincode, 10);
  if (!PINCODE_RE.test(pincode)) return fail("pincode", "Enter the store's 6-digit pincode.");
  out.pincode = pincode;

  if (b.coordinates !== undefined && b.coordinates !== null) {
    const c = b.coordinates as Doc;
    const latitude = Number(c?.latitude);
    const longitude = Number(c?.longitude);
    const inIndia =
      typeof c?.latitude === "number" &&
      typeof c?.longitude === "number" &&
      latitude >= INDIA_BOUNDS.minLat &&
      latitude <= INDIA_BOUNDS.maxLat &&
      longitude >= INDIA_BOUNDS.minLng &&
      longitude <= INDIA_BOUNDS.maxLng;
    if (!inIndia) return fail("coordinates", "The store location must be in India.");
    out.coordinates = { latitude, longitude };
  }

  const service = parseServicePincodes(b.servicePincodes, pincode);
  if (!service.ok) return service;
  out.servicePincodes = service.value;

  const hours = (b.operatingHours ?? null) as Doc | null;
  if (!hours || typeof hours !== "object") return fail("operatingHours", "Enter the store's opening and closing times.");
  const openTime = text(hours.openTime, 5);
  const closeTime = text(hours.closeTime, 5);
  if (!TIME_RE.test(openTime) || !TIME_RE.test(closeTime)) return fail("operatingHours", "Opening and closing times must be HH:mm (24-hour).");
  if (openTime === closeTime) return fail("operatingHours", "Opening and closing times cannot be the same.");
  if (hours.isOpenToday !== undefined && typeof hours.isOpenToday !== "boolean") return fail("operatingHours", "Say whether the store is open today.");
  out.operatingHours = { openTime, closeTime, isOpenToday: hours.isOpenToday !== false };

  if (!Array.isArray(b.categories) || b.categories.length === 0) return fail("categories", "Choose at least one category you sell.");
  const cats = [...new Set(b.categories.map((c) => text(c, 40).toLowerCase()))];
  if (cats.length > STORE_CATEGORIES.length) return fail("categories", `Choose up to ${STORE_CATEGORIES.length} categories.`);
  if (!cats.every((c) => (STORE_CATEGORIES as readonly string[]).includes(c))) return fail("categories", "One of the categories is not one GlowVai offers.");
  out.categories = cats;

  if (b.pan !== undefined && b.pan !== null && b.pan !== "") {
    const pan = upper(b.pan, 12);
    if (!PAN_RE.test(pan)) return fail("pan", "Enter a valid PAN (for example ABCDE1234F), or leave it empty.");
    out.panLast4 = pan.slice(-4);
  }

  if (b.bank !== undefined && b.bank !== null) {
    const bank = parseBank(b.bank);
    if (!bank.ok) return bank;
    out.bank = bank.value;
  }
  return { ok: true, value: out };
}

export function parseServicePincodes(v: unknown, storePincode: string): Result<string[]> {
  if (!Array.isArray(v)) return fail("servicePincodes", "Add the pincodes your store delivers to.");
  const list: string[] = [];
  for (const raw of v) {
    const p = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
    if (!PINCODE_RE.test(p)) return fail("servicePincodes", "Every service pincode must be a valid 6-digit pincode.");
    if (!list.includes(p)) list.push(p);
  }
  // The store's own pincode is always served.
  if (!list.includes(storePincode)) list.unshift(storePincode);
  if (list.length > MAX_SERVICE_PINCODES) return fail("servicePincodes", `Up to ${MAX_SERVICE_PINCODES} service pincodes, including the store's own.`);
  return { ok: true, value: list };
}

const FULL_ACCOUNT_KEYS = ["accountNumber", "accNumber", "accountNo", "account", "accNo"];

function parseBank(v: unknown): Result<NonNullable<ApplicationFields["bank"]>> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail("bank", "Enter the bank details, or leave them out.");
  const b = v as Doc;
  // The full account number is never accepted, so it can never be stored or leaked.
  if (FULL_ACCOUNT_KEYS.some((k) => b[k] !== undefined)) return fail("bank", "Send only the last 4 digits of the account number.");
  const holder = name(b.holderName, "bank.holderName", "account holder's name");
  if (!holder.ok) return holder;
  const bankName = name(b.bankName, "bank.bankName", "bank name");
  if (!bankName.ok) return bankName;
  const ifsc = upper(b.ifsc, 15);
  if (!IFSC_RE.test(ifsc)) return fail("bank.ifsc", "Enter a valid 11-character IFSC (for example HDFC0001234).");
  const accLast4 = typeof b.accLast4 === "string" || typeof b.accLast4 === "number" ? String(b.accLast4).trim() : "";
  if (!/^\d{4}$/.test(accLast4)) return fail("bank.accLast4", "Enter the last 4 digits of the account number.");
  const value: NonNullable<ApplicationFields["bank"]> = {
    holderName: holder.value,
    bankName: bankName.value,
    ifsc: maskIfscForStorage(ifsc),
    accLast4,
  };
  if (b.upiVpa !== undefined && b.upiVpa !== null && b.upiVpa !== "") {
    const upi = text(b.upiVpa, 100);
    if (!UPI_RE.test(upi)) return fail("bank.upiVpa", "Enter a valid UPI id (for example store@okhdfc), or leave it empty.");
    value.upiVpa = upi;
  }
  return { ok: true, value };
}

// ── Orders ─────────────────────────────────────────────────────────────────────────────────────

export const DECLINE_REASONS = ["OUT_OF_STOCK", "STORE_BUSY", "CLOSING_SOON", "ITEM_DAMAGED", "OTHER"] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export function parseDecline(body: unknown): Result<{ reason: DeclineReason; note?: string }> {
  const b = (body && typeof body === "object" ? body : {}) as Doc;
  const reason = text(b.reason, 40).toUpperCase();
  if (!(DECLINE_REASONS as readonly string[]).includes(reason)) return fail("reason", "Choose why you are declining this order.");
  if (reason !== "OTHER") return { ok: true, value: { reason: reason as DeclineReason } };
  const rawNote = typeof b.note === "string" ? b.note.trim() : "";
  if (rawNote.length < 3) return fail("note", "Add a short note (up to 200 characters) when the reason is Other.");
  if (rawNote.length > 200) return fail("note", "The note can be up to 200 characters.");
  return { ok: true, value: { reason: "OTHER", note: rawNote } };
}

export function parseCheckedProductIds(body: unknown): Result<string[]> {
  const b = (body && typeof body === "object" ? body : {}) as Doc;
  const ids = b.checkedProductIds;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) return fail("checkedProductIds", "Check every item in the order before marking it packed.");
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || !PRODUCT_ID_RE.test(id)) return fail("checkedProductIds", "One of the checked items is not valid.");
    if (!out.includes(id)) out.push(id);
  }
  return { ok: true, value: out };
}

export function parseSince(v: string | null): Result<number> {
  if (v === null || v === "") return { ok: true, value: 0 };
  if (!/^\d{1,15}$/.test(v)) return fail("since", "since must be a time in milliseconds.");
  return { ok: true, value: Number(v) };
}

// ── Inventory ──────────────────────────────────────────────────────────────────────────────────

export const MAX_STOCK = 100_000;
export const MAX_INVENTORY_ITEMS = 100;

export interface InventoryInput {
  productId: string;
  stock: number;
  isAvailable: boolean;
  unitPriceOverride?: number;
}

export function parseInventory(body: unknown): Result<InventoryInput[]> {
  const b = (body && typeof body === "object" ? body : {}) as Doc;
  if (!Array.isArray(b.items) || b.items.length === 0) return fail("items", "Send at least one product.");
  if (b.items.length > MAX_INVENTORY_ITEMS) return fail("items", `Up to ${MAX_INVENTORY_ITEMS} products at a time.`);
  const seen = new Set<string>();
  const out: InventoryInput[] = [];
  for (const raw of b.items) {
    const it = (raw && typeof raw === "object" ? raw : {}) as Doc;
    const productId = typeof it.productId === "string" ? it.productId.trim() : "";
    if (!PRODUCT_ID_RE.test(productId)) return fail("items.productId", "Every item needs a valid product.");
    if (seen.has(productId)) return fail("items.productId", "A product appears twice. Send each product once.");
    seen.add(productId);
    if (typeof it.stock !== "number" || !Number.isInteger(it.stock) || it.stock < 0 || it.stock > MAX_STOCK) {
      return fail("items.stock", `Stock must be a whole number from 0 to ${MAX_STOCK}.`);
    }
    if (typeof it.isAvailable !== "boolean") return fail("items.isAvailable", "Say whether each product is available.");
    const item: InventoryInput = { productId, stock: it.stock, isAvailable: it.isAvailable };
    if (it.unitPriceOverride !== undefined && it.unitPriceOverride !== null) {
      const price = it.unitPriceOverride;
      if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return fail("items.unitPriceOverride", "A store price must be more than ₹0.");
      item.unitPriceOverride = Math.round(price * 100) / 100;
    }
    out.push(item);
  }
  return { ok: true, value: out };
}

/** A product's MRP from the admin product record: `mrp` when set, else worked back from brandPrice and brandDiscount. */
export function productMrp(p: Doc): number {
  const mrp = Number(p.mrp);
  if (Number.isFinite(mrp) && mrp > 0) return mrp;
  const price = Number(p.brandPrice) || 0;
  const discount = Math.min(99, Math.max(0, Number(p.brandDiscount) || 0));
  return discount > 0 ? Math.round(price / (1 - discount / 100)) : price;
}

// ── Support ────────────────────────────────────────────────────────────────────────────────────

// Admin ticket categories (admin panel TICKET_CATEGORIES) that make sense for a store.
export const VENDOR_TICKET_CATEGORIES = [
  "ORDER_DELAY",
  "CANCELLATION_REQUEST",
  "WRONG_PRODUCT",
  "MISSING_PRODUCT",
  "DAMAGED_PRODUCT",
  "DELIVERY_PROBLEM",
  "PAYMENT_ISSUE",
  "ACCOUNT_ISSUE",
  "SUSPECTED_COUNTERFEIT",
  "PRODUCT_SAFETY",
] as const;

export function parseTicket(body: unknown): Result<{ category: string; subject: string; description: string; orderId: string | null }> {
  const b = (body && typeof body === "object" ? body : {}) as Doc;
  const category = text(b.category, 40).toUpperCase();
  if (!(VENDOR_TICKET_CATEGORIES as readonly string[]).includes(category)) return fail("category", "Choose what the problem is about.");
  const subject = text(b.subject, 121);
  if (subject.length < 3 || subject.length > 120) return fail("subject", "Add a short subject (3 to 120 characters).");
  const description = text(b.description, 2001);
  if (description.length < 10 || description.length > 2000) return fail("description", "Describe the problem in 10 to 2000 characters.");
  let orderId: string | null = null;
  if (b.orderId !== undefined && b.orderId !== null && b.orderId !== "") {
    const id = text(b.orderId, 65);
    if (!ORDER_ID_RE.test(id)) return fail("orderId", "That order reference is not valid.");
    orderId = id;
  }
  return { ok: true, value: { category, subject, description, orderId } };
}
