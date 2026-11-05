// A vendor's effective state: the application they submitted (vendorApplications/VAPP-{uid}, written by this server),
// with the GlowVai team's decisions on top (admin_vendors/VAPP-{uid}, written by the admin panel). Pure functions only.

type Doc = Record<string, unknown>;

export type VendorStateName =
  | "NO_APPLICATION"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "DOCUMENTS_REQUESTED"
  | "REJECTED"
  | "APPROVED_ACTIVE"
  | "APPROVED_PAUSED"
  | "SUSPENDED";

export interface VendorApplicationView {
  storeName: string;
  ownerName: string;
  contactNumber: string;
  email: string;
  gstNumber?: string;
  businessRegistrationNumber?: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  servicePincodes: string[];
  operatingHours: { openTime: string; closeTime: string; isOpenToday: boolean };
  categories: string[];
  panLast4?: string;
  bank?: { holderName: string; bankName: string; ifscMasked: string; accLast4: string; upiVpa?: string };
  submittedAt: number;
  updatedAt: number;
}

export interface VendorMe {
  applicationId: string;
  state: VendorStateName;
  canOperate: boolean;
  isOnline: boolean;
  lastSeenAt: number | null;
  reason?: string;
  requestedDocuments?: string[];
  application: VendorApplicationView | null;
}

/** What order dispatch needs to know about a vendor. */
export interface OperatingVendor {
  uid: string;
  applicationId: string;
  storeName: string;
  canOperate: boolean;
  /** applicationStatus APPROVED, even when paused: may see own orders and edit stock. */
  approved: boolean;
  isOnline: boolean;
  lastSeenAt: number | null;
  servicePincodes: string[];
}

export const applicationIdFor = (uid: string) => `VAPP-${uid}`;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// Admin timestamps may be ISO strings or ms numbers.
export function toMs(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v) {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (v && typeof v === "object" && typeof (v as { toMillis?: unknown }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/**
 * When the team last changed this vendor: `overlayUpdatedAt` (ISO, set by the admin panel on every staff change).
 * Older overlays without it fall back to the newest history entry, then the overlay's updatedAt.
 */
export function decisionAt(overlay: Doc): number {
  const stamped = toMs(overlay.overlayUpdatedAt);
  if (stamped) return stamped;
  const latest = arr(overlay.history).reduce<number>((m, h) => Math.max(m, toMs((h as Doc)?.at)), 0);
  return latest || toMs(overlay.updatedAt);
}

/** Newest history entry that carries a reason (the team's note on a rejection or a documents request). */
function latestReason(overlay: Doc): string | undefined {
  let bestAt = -1;
  let bestReason: string | undefined;
  for (const raw of arr(overlay.history)) {
    const h = (raw ?? {}) as Doc;
    const reason = str(h.reason).trim();
    if (!reason) continue;
    const at = toMs(h.at);
    // Later entries win ties: history is appended in order.
    if (at >= bestAt) {
      bestAt = at;
      bestReason = reason;
    }
  }
  return bestReason;
}

export interface StateResult {
  state: VendorStateName;
  canOperate: boolean;
  approved: boolean;
  reason?: string;
  requestedDocuments?: string[];
}

export function vendorStateOf(app: Doc | null, overlay: Doc | null): StateResult {
  if (!app) return { state: "NO_APPLICATION", canOperate: false, approved: false };
  const o = overlay ?? {};
  const applicationStatus = str(o.applicationStatus).toUpperCase();
  const operationalStatus = str(o.operationalStatus).toUpperCase();
  const approved = applicationStatus === "APPROVED";
  const canOperate = approved && operationalStatus === "ACTIVE";

  if (operationalStatus === "SUSPENDED") return { state: "SUSPENDED", canOperate: false, approved };
  if (approved) return { state: canOperate ? "APPROVED_ACTIVE" : "APPROVED_PAUSED", canOperate, approved };

  if (applicationStatus === "REJECTED" || applicationStatus === "DOCUMENTS_REQUESTED") {
    // A resubmission made after the team's last change goes back to the queue (no reason or document list).
    const resubmittedAt = num(app.resubmittedAt) ?? 0;
    if (resubmittedAt && resubmittedAt > decisionAt(o)) return { state: "SUBMITTED", canOperate: false, approved: false };
    const result: StateResult = { state: applicationStatus as VendorStateName, canOperate: false, approved: false };
    const reason = latestReason(o);
    if (reason) result.reason = reason;
    if (applicationStatus === "DOCUMENTS_REQUESTED") {
      result.requestedDocuments = arr(o.documents)
        .map((d) => (d ?? {}) as Doc)
        .filter((d) => str(d.status).toUpperCase() === "MISSING" && str(d.name))
        .map((d) => str(d.name));
    }
    return result;
  }
  if (applicationStatus === "UNDER_REVIEW") return { state: "UNDER_REVIEW", canOperate: false, approved: false };
  // No staff decision yet (or SUBMITTED): the application's own status.
  if (str(app.status).toUpperCase() === "REJECTED") return { state: "REJECTED", canOperate: false, approved: false };
  return { state: "SUBMITTED", canOperate: false, approved: false };
}

/** Application states in which the vendor may (re)submit the application. */
export const EDITABLE_STATES: readonly VendorStateName[] = ["NO_APPLICATION", "SUBMITTED", "DOCUMENTS_REQUESTED", "REJECTED"];

function applicationView(app: Doc): VendorApplicationView {
  const hours = (app.operatingHours ?? {}) as Doc;
  const view: VendorApplicationView = {
    storeName: str(app.storeName),
    ownerName: str(app.ownerName),
    contactNumber: str(app.contactNumber),
    email: str(app.email),
    streetAddress: str(app.streetAddress),
    city: str(app.city),
    state: str(app.state),
    pincode: str(app.pincode),
    servicePincodes: arr(app.servicePincodes).map(str).filter(Boolean),
    operatingHours: { openTime: str(hours.openTime), closeTime: str(hours.closeTime), isOpenToday: hours.isOpenToday !== false },
    categories: arr(app.categories).map(str).filter(Boolean),
    submittedAt: num(app.submittedAt) ?? 0,
    updatedAt: num(app.updatedAt) ?? 0,
  };
  if (str(app.gstNumber)) view.gstNumber = str(app.gstNumber);
  if (str(app.businessRegistrationNumber)) view.businessRegistrationNumber = str(app.businessRegistrationNumber);
  if (str(app.panLast4)) view.panLast4 = str(app.panLast4);
  const bank = app.bank && typeof app.bank === "object" ? (app.bank as Doc) : null;
  if (bank) {
    view.bank = {
      holderName: str(bank.holderName),
      bankName: str(bank.bankName),
      // Stored already masked; mask again in case an older record holds the full code.
      ifscMasked: maskIfsc(str(bank.ifsc)),
      accLast4: str(bank.accLast4).slice(-4),
    };
    if (str(bank.upiVpa)) view.bank.upiVpa = str(bank.upiVpa);
  }
  return view;
}

/** IFSC with the branch part hidden: HDFC0001234 -> HDFC0••••34. Idempotent on an already masked value. */
export function maskIfsc(ifsc: string): string {
  if (ifsc.length < 7) return ifsc ? "•".repeat(ifsc.length) : "";
  return `${ifsc.slice(0, 5)}••••${ifsc.slice(-2)}`;
}

export function toVendorMe(uid: string, app: Doc | null, overlay: Doc | null): VendorMe {
  const s = vendorStateOf(app, overlay);
  const me: VendorMe = {
    applicationId: applicationIdFor(uid),
    state: s.state,
    canOperate: s.canOperate,
    isOnline: app?.isOnline === true,
    lastSeenAt: num(app?.lastSeenAt),
    application: app ? applicationView(app) : null,
  };
  if (s.reason) me.reason = s.reason;
  if (s.requestedDocuments) me.requestedDocuments = s.requestedDocuments;
  return me;
}

export function operatingVendor(uid: string, app: Doc | null, overlay: Doc | null): OperatingVendor {
  const s = vendorStateOf(app, overlay);
  return {
    uid,
    applicationId: applicationIdFor(uid),
    storeName: str(app?.storeName) || "Store",
    canOperate: s.canOperate,
    approved: s.approved,
    isOnline: app?.isOnline === true,
    lastSeenAt: num(app?.lastSeenAt),
    servicePincodes: arr(app?.servicePincodes).map(str).filter(Boolean),
  };
}
