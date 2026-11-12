// Form checks for the vendor web onboarding and support forms. These copy the rules in lib/vendor/validation.ts (the
// server decides; this only gives early, friendly feedback). __tests__/vendor-web/account.test.ts runs both side by side
// on the same inputs so the two cannot drift apart. Pure functions, no imports from the server or from React.

export const STORE_CATEGORY_IDS = ["skincare", "haircare", "makeup", "fragrance", "bath-body", "mens-grooming", "wellness"] as const;
export type StoreCategoryId = (typeof STORE_CATEGORY_IDS)[number];

export const CATEGORY_LABELS: Record<StoreCategoryId, string> = {
  skincare: "Skincare",
  haircare: "Haircare",
  makeup: "Makeup",
  fragrance: "Fragrance",
  "bath-body": "Bath & body",
  "mens-grooming": "Men's grooming",
  wellness: "Wellness",
};

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const UPI_RE = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;
export const PINCODE_RE = /^[1-9]\d{5}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const REGISTRATION_RE = /^[A-Za-z0-9][A-Za-z0-9 /.-]{2,39}$/;
export const ACC_LAST4_RE = /^\d{4}$/;
export const ORDER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const MAX_SERVICE_PINCODES = 20;
export const MAX_CATEGORIES = STORE_CATEGORY_IDS.length;

export const TICKET_SUBJECT_MIN = 3;
export const TICKET_SUBJECT_MAX = 120;
export const TICKET_DESCRIPTION_MIN = 10;
export const TICKET_DESCRIPTION_MAX = 2000;

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export type FieldErrors = Record<string, string>;
export type Checked<T> = { ok: true; value: T } | { ok: false; field: string; error: string };

/** Same trimming as the server's text() helper: trim, then cut to max characters. */
export const cleanText = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Mirrors indianMobile() on the server: 10 digits starting 6-9, a leading 91 is allowed. */
export function normaliseMobile(v: unknown): string {
  const digits = cleanText(v, 20).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

/** Store and owner names: whitespace collapsed, 2 to 120 characters. */
export function checkName(v: unknown, field: string, label: string): Checked<string> {
  if (typeof v !== "string") return { ok: false, field, error: `Enter the ${label}.` };
  const s = v.trim().replace(/\s+/g, " ");
  if (s.length < 2 || s.length > 120) return { ok: false, field, error: `The ${label} must be 2 to 120 characters.` };
  return { ok: true, value: s };
}

export function checkStoreName(v: unknown): Checked<string> {
  return checkName(v, "storeName", "store name");
}

export function checkOwnerName(v: unknown): Checked<string> {
  return checkName(v, "ownerName", "owner's name");
}

export function checkMobile(v: unknown): Checked<string> {
  const m = normaliseMobile(v);
  return m ? { ok: true, value: `+91${m}` } : { ok: false, field: "contactNumber", error: "Enter a 10-digit Indian mobile number." };
}

export function checkPincode(v: unknown, field = "pincode"): Checked<string> {
  const p = cleanText(v, 10);
  return PINCODE_RE.test(p) ? { ok: true, value: p } : { ok: false, field, error: "Enter the store's 6-digit pincode." };
}

/** Store pincode first, then the extra service pincodes. The store pincode is always served (server behaviour). */
export function checkServicePincodes(extra: unknown[], storePincode: string): Checked<string[]> {
  const list: string[] = [];
  for (const raw of extra) {
    const p = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
    if (!PINCODE_RE.test(p)) return { ok: false, field: "servicePincodes", error: "Every service pincode must be a valid 6-digit pincode." };
    if (!list.includes(p) && p !== storePincode) list.push(p);
  }
  const all = [storePincode, ...list];
  if (all.length > MAX_SERVICE_PINCODES) {
    return { ok: false, field: "servicePincodes", error: `Up to ${MAX_SERVICE_PINCODES} service pincodes, including the store's own.` };
  }
  return { ok: true, value: all };
}

export function checkHours(openTime: unknown, closeTime: unknown, isOpenToday: unknown): Checked<{ openTime: string; closeTime: string; isOpenToday: boolean }> {
  const o = cleanText(openTime, 5);
  const c = cleanText(closeTime, 5);
  if (!TIME_RE.test(o) || !TIME_RE.test(c)) return { ok: false, field: "operatingHours", error: "Opening and closing times must be HH:mm (24-hour)." };
  if (o === c) return { ok: false, field: "operatingHours", error: "Opening and closing times cannot be the same." };
  if (isOpenToday !== undefined && typeof isOpenToday !== "boolean") return { ok: false, field: "operatingHours", error: "Say whether the store is open today." };
  return { ok: true, value: { openTime: o, closeTime: c, isOpenToday: isOpenToday !== false } };
}

export function checkCategories(v: unknown): Checked<string[]> {
  if (!Array.isArray(v) || v.length === 0) return { ok: false, field: "categories", error: "Choose at least one category you sell." };
  const cats = [...new Set(v.map((c) => cleanText(c, 40).toLowerCase()))];
  if (cats.length > MAX_CATEGORIES) return { ok: false, field: "categories", error: `Choose up to ${MAX_CATEGORIES} categories.` };
  if (!cats.every((c) => (STORE_CATEGORY_IDS as readonly string[]).includes(c))) {
    return { ok: false, field: "categories", error: "One of the categories is not one GlowVai offers." };
  }
  return { ok: true, value: cats };
}

/** Optional GSTIN: blank is fine; otherwise the 15-character format. Spaces are removed and letters upper-cased. */
export function checkGstin(v: unknown): Checked<string | undefined> {
  const raw = cleanText(v, 20).toUpperCase().replace(/\s+/g, "");
  if (!raw) return { ok: true, value: undefined };
  return GSTIN_RE.test(raw) ? { ok: true, value: raw } : { ok: false, field: "gstNumber", error: "Enter a valid 15-character GSTIN, or leave it empty." };
}

export function checkRegistration(v: unknown): Checked<string | undefined> {
  const raw = cleanText(v, 41);
  if (!raw) return { ok: true, value: undefined };
  return REGISTRATION_RE.test(raw)
    ? { ok: true, value: raw }
    : { ok: false, field: "businessRegistrationNumber", error: "The registration number must be 3 to 40 letters, digits, spaces, / . or -." };
}

/** Optional PAN: blank is fine; otherwise the full format. The full value goes to the server; only its last four are stored. */
export function checkPan(v: unknown): Checked<string | undefined> {
  const raw = cleanText(v, 12).toUpperCase().replace(/\s+/g, "");
  if (!raw) return { ok: true, value: undefined };
  return PAN_RE.test(raw) ? { ok: true, value: raw } : { ok: false, field: "pan", error: "Enter a valid PAN (for example ABCDE1234F), or leave it empty." };
}

export interface BankInput {
  holderName: string;
  bankName: string;
  ifsc: string;
  accLast4: string;
  upiVpa: string;
}

/** Bank is optional as a whole. If any of holder, bank name, IFSC or last four is filled, all four are needed. */
export function checkBank(v: BankInput): Checked<ApplicationBank | undefined> {
  const any = [v.holderName, v.bankName, v.ifsc, v.accLast4, v.upiVpa].some((x) => cleanText(x, 200) !== "");
  if (!any) return { ok: true, value: undefined };
  const holder = checkName(v.holderName, "bank.holderName", "account holder's name");
  if (!holder.ok) return holder;
  const bankName = checkName(v.bankName, "bank.bankName", "bank name");
  if (!bankName.ok) return bankName;
  const ifsc = cleanText(v.ifsc, 15).toUpperCase().replace(/\s+/g, "");
  if (!IFSC_RE.test(ifsc)) return { ok: false, field: "bank.ifsc", error: "Enter a valid 11-character IFSC (for example HDFC0001234)." };
  // Not cut short: "12345" must fail, as it does on the server.
  const acc = cleanText(v.accLast4, 20);
  if (!ACC_LAST4_RE.test(acc)) return { ok: false, field: "bank.accLast4", error: "Enter the last 4 digits of the account number." };
  const out: ApplicationBank = { holderName: holder.value, bankName: bankName.value, ifsc, accLast4: acc };
  if (cleanText(v.upiVpa, 100)) {
    const upi = cleanText(v.upiVpa, 100);
    if (!UPI_RE.test(upi)) return { ok: false, field: "bank.upiVpa", error: "Enter a valid UPI id (for example store@okhdfc), or leave it empty." };
    out.upiVpa = upi;
  }
  return { ok: true, value: out };
}

export interface ApplicationBank {
  holderName: string;
  bankName: string;
  ifsc: string;
  accLast4: string;
  upiVpa?: string;
}

/** Support ticket form. Limits match lib/vendor/validation.ts parseTicket. */
export function checkTicket(input: { category: string; subject: string; description: string; orderId: string }): Checked<{
  category: string;
  subject: string;
  description: string;
  orderId: string | null;
}> {
  const subject = cleanText(input.subject, TICKET_SUBJECT_MAX + 1);
  if (subject.length < TICKET_SUBJECT_MIN || subject.length > TICKET_SUBJECT_MAX) {
    return { ok: false, field: "subject", error: `Add a short subject (${TICKET_SUBJECT_MIN} to ${TICKET_SUBJECT_MAX} characters).` };
  }
  const description = cleanText(input.description, TICKET_DESCRIPTION_MAX + 1);
  if (description.length < TICKET_DESCRIPTION_MIN || description.length > TICKET_DESCRIPTION_MAX) {
    return { ok: false, field: "description", error: `Describe the problem in ${TICKET_DESCRIPTION_MIN} to ${TICKET_DESCRIPTION_MAX} characters.` };
  }
  const orderRaw = cleanText(input.orderId, 65);
  if (orderRaw && !ORDER_ID_RE.test(orderRaw)) return { ok: false, field: "orderId", error: "That order reference is not valid." };
  if (!input.category) return { ok: false, field: "category", error: "Choose what the problem is about." };
  return { ok: true, value: { category: input.category, subject, description, orderId: orderRaw || null } };
}

/** Password for a new account or a change. Firebase enforces its own minimum; this is the friendlier floor. */
export const PASSWORD_MIN = 8;
export function checkNewPassword(v: string): Checked<string> {
  if (v.length < PASSWORD_MIN) return { ok: false, field: "password", error: `Use at least ${PASSWORD_MIN} characters.` };
  if (v.length > 128) return { ok: false, field: "password", error: "Use 128 characters or fewer." };
  return { ok: true, value: v };
}

/** Email shape check for sign-in, create and reset forms. The server does not see these emails, so this stays simple. */
export function checkEmail(v: string): Checked<string> {
  const e = v.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254
    ? { ok: true, value: e }
    : { ok: false, field: "email", error: "Enter a valid email address." };
}

export function maskAccount(last4: string): string {
  return last4 ? `•••• ${last4}` : "";
}
