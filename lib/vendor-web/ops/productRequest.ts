// Product request form rules. Mirrors lib/vendor/productRequests.ts so people see errors before sending; the server still
// enforces every rule. Pure.

export const PRODUCT_CATEGORIES = [
  { value: "skincare", label: "Skincare" },
  { value: "haircare", label: "Haircare" },
  { value: "makeup", label: "Makeup" },
  { value: "fragrance", label: "Fragrance" },
  { value: "bath-body", label: "Bath and body" },
  { value: "mens-grooming", label: "Men's grooming" },
  { value: "wellness", label: "Wellness" },
] as const;

export const PICTURE_HOSTS = ["images.unsplash.com", "firebasestorage.googleapis.com", "storage.googleapis.com"] as const;
export const MAX_PICTURES = 3;
export const MAX_REQUEST_MRP = 1_000_000;
export const DAILY_REQUEST_CAP = 5;

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Waiting for review",
  APPROVED: "Approved, being added to the catalogue",
  REJECTED: "Not added",
  NEEDS_INFO: "More information needed",
};

export interface ProductRequestForm {
  name: string;
  brand: string;
  category: string;
  mrp: string;
  barcode: string;
  pictureUrls: string[];
  reason: string;
}

export interface ProductRequestPayload {
  name: string;
  brand: string;
  category: string;
  mrp: number;
  barcode: string | null;
  pictureUrls: string[];
  reason: string;
}

export type FormErrors = Partial<Record<"name" | "brand" | "category" | "mrp" | "barcode" | "pictureUrls" | "reason", string>>;

/** True only for an https URL on an allowed host, with no credentials and no port. */
export function pictureUrlAllowed(raw: string): boolean {
  if (raw.length > 500) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  return (PICTURE_HOSTS as readonly string[]).includes(url.hostname.toLowerCase());
}

const clean = (s: string) => s.trim().replace(/\s+/g, " ");

export function validateProductRequest(form: ProductRequestForm): { ok: true; value: ProductRequestPayload } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};
  const name = clean(form.name);
  const brand = clean(form.brand);
  const reason = clean(form.reason);
  const barcode = form.barcode.trim();
  const mrp = form.mrp.trim();
  const pictures = form.pictureUrls.map((u) => u.trim()).filter((u) => u !== "");

  if (name.length < 2 || name.length > 120) errors.name = "The product name must be 2 to 120 characters.";
  if (brand.length < 2 || brand.length > 80) errors.brand = "The brand must be 2 to 80 characters.";
  if (!PRODUCT_CATEGORIES.some((c) => c.value === form.category)) errors.category = "Choose the category this product belongs to.";

  const mrpNum = Number(mrp);
  if (!/^\d+$/.test(mrp) || !Number.isSafeInteger(mrpNum) || mrpNum < 1 || mrpNum > MAX_REQUEST_MRP) {
    errors.mrp = `The MRP must be a whole rupee amount from 1 to ${MAX_REQUEST_MRP}.`;
  }

  if (barcode !== "" && !/^\d{8,14}$/.test(barcode)) errors.barcode = "The barcode must be 8 to 14 digits, or leave it empty.";

  if (pictures.length > MAX_PICTURES) errors.pictureUrls = `Add up to ${MAX_PICTURES} pictures.`;
  else if (pictures.some((u) => !pictureUrlAllowed(u))) {
    errors.pictureUrls = "Pictures must be https links from an image host GlowVai accepts.";
  }

  if (reason.length < 10 || reason.length > 500) errors.reason = "Tell us why this product should be added, in 10 to 500 characters.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      brand,
      category: form.category,
      mrp: mrpNum,
      barcode: barcode === "" ? null : barcode,
      pictureUrls: [...new Set(pictures)],
      reason,
    },
  };
}
