// The onboarding form as plain data: prefill from the server's application, step checks, and the request body for
// POST /api/vendor/application. Pure, so the tests can feed the request body to the server's own validator.

import { normaliseMobile, checkBank, checkCategories, checkGstin, checkHours, checkMobile, checkOwnerName, checkPan, checkPincode, checkRegistration, checkServicePincodes, checkStoreName, cleanText, INDIAN_STATES, STORE_CATEGORY_IDS, type Checked } from "./validation";
import type { ApplicationInput, VendorApplicationView } from "./types";

export interface OnboardingForm {
  storeName: string;
  ownerName: string;
  mobile: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  /** Service pincodes other than the store's own (the store pincode is always served and is not listed here). */
  extraPincodes: string[];
  openTime: string;
  closeTime: string;
  isOpenToday: boolean;
  categories: string[];
  gstNumber: string;
  registrationNumber: string;
  /** Full PAN, typed in for this submission only. It is never prefilled or drafted. */
  pan: string;
  bankHolder: string;
  bankName: string;
  ifsc: string;
  accLast4: string;
  upiVpa: string;
}

export const EMPTY_FORM: OnboardingForm = {
  storeName: "",
  ownerName: "",
  mobile: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  extraPincodes: [],
  openTime: "10:00",
  closeTime: "21:00",
  isOpenToday: true,
  categories: [],
  gstNumber: "",
  registrationNumber: "",
  pan: "",
  bankHolder: "",
  bankName: "",
  ifsc: "",
  accLast4: "",
  upiVpa: "",
};

export type StepId = "store" | "address" | "tax" | "review";
export const STEPS: { id: StepId; letter: "A" | "B" | "C" | "D"; label: string }[] = [
  { id: "store", letter: "A", label: "Store" },
  { id: "address", letter: "B", label: "Address and hours" },
  { id: "tax", letter: "C", label: "Tax and bank" },
  { id: "review", letter: "D", label: "Review" },
];

export type FormErrors = Partial<Record<keyof OnboardingForm | "servicePincodes" | "hours" | "bank", string>>;

/** The form from the server's saved application (Edit and resubmit). IFSC and PAN come back masked or not at all, so they are re-entered. */
export function formFromApplication(app: VendorApplicationView): OnboardingForm {
  const bank = app.bank;
  return {
    ...EMPTY_FORM,
    storeName: app.storeName,
    ownerName: app.ownerName,
    mobile: normaliseMobile(app.contactNumber),
    street: app.streetAddress,
    city: app.city,
    state: app.state,
    pincode: app.pincode,
    extraPincodes: app.servicePincodes.filter((p) => p !== app.pincode),
    openTime: app.operatingHours.openTime || EMPTY_FORM.openTime,
    closeTime: app.operatingHours.closeTime || EMPTY_FORM.closeTime,
    isOpenToday: app.operatingHours.isOpenToday,
    categories: app.categories.filter((c) => (STORE_CATEGORY_IDS as readonly string[]).includes(c)),
    gstNumber: app.gstNumber ?? "",
    registrationNumber: app.businessRegistrationNumber ?? "",
    bankHolder: bank?.holderName ?? "",
    bankName: bank?.bankName ?? "",
    accLast4: bank?.accLast4 ?? "",
    upiVpa: bank?.upiVpa ?? "",
  };
}

/** What a draft keeps. The full PAN is never written to browser storage. */
export function draftable(form: OnboardingForm): Omit<OnboardingForm, "pan"> {
  const copy: Partial<OnboardingForm> = { ...form };
  delete copy.pan;
  return copy as Omit<OnboardingForm, "pan">;
}

/** Restores a draft, keeping only known fields with the right types. */
export function formFromDraft(raw: unknown): OnboardingForm | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const out: OnboardingForm = { ...EMPTY_FORM };
  for (const key of Object.keys(EMPTY_FORM) as (keyof OnboardingForm)[]) {
    if (key === "pan") continue;
    const fallback = EMPTY_FORM[key];
    const value = d[key];
    if (typeof fallback === "string" && typeof value === "string") (out as unknown as Record<string, unknown>)[key] = value.slice(0, 400);
    else if (typeof fallback === "boolean" && typeof value === "boolean") (out as unknown as Record<string, unknown>)[key] = value;
    else if (Array.isArray(fallback) && Array.isArray(value)) {
      (out as unknown as Record<string, unknown>)[key] = value.filter((x): x is string => typeof x === "string").slice(0, 20);
    }
  }
  return out;
}

type Put = (key: keyof FormErrors, result: Checked<unknown>) => void;

function collect(form: OnboardingForm, only: StepId | "all"): { errors: FormErrors; values: Partial<Record<string, unknown>> } {
  const errors: FormErrors = {};
  const values: Partial<Record<string, unknown>> = {};
  const put: Put = (key, result) => {
    if (!result.ok) errors[key] = result.error;
  };
  const want = (step: StepId) => only === "all" || only === step;

  if (want("store")) {
    const storeName = checkStoreName(form.storeName);
    put("storeName", storeName);
    if (storeName.ok) values.storeName = storeName.value;
    const owner = checkOwnerName(form.ownerName);
    put("ownerName", owner);
    if (owner.ok) values.ownerName = owner.value;
    const mobile = checkMobile(form.mobile);
    put("mobile", mobile);
    if (mobile.ok) values.contactNumber = mobile.value;
  }

  if (want("address")) {
    const street = cleanText(form.street, 301);
    if (street.length < 5 || street.length > 300) errors.street = "Enter the store's street address (5 to 300 characters).";
    else values.streetAddress = street;
    const city = cleanText(form.city, 81);
    if (city.length < 2 || city.length > 80) errors.city = "Enter the city.";
    else values.city = city;
    if (!(INDIAN_STATES as readonly string[]).includes(form.state)) errors.state = "Choose the state the store is in.";
    else values.state = form.state;
    const pin = checkPincode(form.pincode);
    put("pincode", pin);
    if (pin.ok) {
      const service = checkServicePincodes(form.extraPincodes, pin.value);
      put("servicePincodes", service);
      if (service.ok) values.servicePincodes = service.value;
      values.pincode = pin.value;
    }
    const hours = checkHours(form.openTime, form.closeTime, form.isOpenToday);
    if (!hours.ok) errors.hours = hours.error;
    else values.operatingHours = hours.value;
    const cats = checkCategories(form.categories);
    put("categories", cats);
    if (cats.ok) values.categories = cats.value;
  }

  if (want("tax")) {
    const gst = checkGstin(form.gstNumber);
    put("gstNumber", gst);
    if (gst.ok && gst.value) values.gstNumber = gst.value;
    const reg = checkRegistration(form.registrationNumber);
    put("registrationNumber", reg);
    if (reg.ok && reg.value) values.businessRegistrationNumber = reg.value;
    const pan = checkPan(form.pan);
    put("pan", pan);
    if (pan.ok && pan.value) values.pan = pan.value;
    const bank = checkBank({ holderName: form.bankHolder, bankName: form.bankName, ifsc: form.ifsc, accLast4: form.accLast4, upiVpa: form.upiVpa });
    if (!bank.ok) errors[bankErrorKey(bank.field)] = bank.error;
    else if (bank.value) values.bank = bank.value;
  }
  return { errors, values };
}

function bankErrorKey(field: string): keyof FormErrors {
  if (field === "bank.holderName") return "bankHolder";
  if (field === "bank.bankName") return "bankName";
  if (field === "bank.ifsc") return "ifsc";
  if (field === "bank.accLast4") return "accLast4";
  if (field === "bank.upiVpa") return "upiVpa";
  return "bank";
}

/** Field errors for one step. An empty object means the step can be left. */
export function validateStep(step: StepId, form: OnboardingForm): FormErrors {
  return collect(form, step).errors;
}

/** The first step that has an error, so the form can send the user back to it. */
export function firstStepWithErrors(form: OnboardingForm): StepId | null {
  for (const s of STEPS) if (Object.keys(validateStep(s.id, form)).length > 0) return s.id;
  return null;
}

/** The request body for POST /api/vendor/application, or the field errors when the form is not complete. */
export function buildApplicationInput(form: OnboardingForm): { ok: true; value: ApplicationInput } | { ok: false; errors: FormErrors } {
  const { errors, values } = collect(form, "all");
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const v = values as Partial<ApplicationInput> & Record<string, unknown>;
  const value: ApplicationInput = {
    storeName: String(v.storeName),
    ownerName: String(v.ownerName),
    contactNumber: String(v.contactNumber),
    streetAddress: String(v.streetAddress),
    city: String(v.city),
    state: String(v.state),
    pincode: String(v.pincode),
    servicePincodes: (v.servicePincodes as string[]) ?? [],
    operatingHours: v.operatingHours as ApplicationInput["operatingHours"],
    categories: v.categories as string[],
  };
  if (v.gstNumber) value.gstNumber = String(v.gstNumber);
  if (v.businessRegistrationNumber) value.businessRegistrationNumber = String(v.businessRegistrationNumber);
  if (v.pan) value.pan = String(v.pan);
  if (v.bank) value.bank = v.bank as ApplicationInput["bank"];
  return { ok: true, value };
}

/** Where the review step sends the user to fix a server-reported field. */
export function stepForServerField(field: string | null | undefined): StepId {
  if (!field) return "store";
  if (["storeName", "ownerName", "contactNumber"].includes(field)) return "store";
  if (["gstNumber", "businessRegistrationNumber", "pan", "bank", "bank.holderName", "bank.bankName", "bank.ifsc", "bank.accLast4", "bank.upiVpa"].some((f) => field === f || field.startsWith(`${f}.`))) return "tax";
  return "address";
}

