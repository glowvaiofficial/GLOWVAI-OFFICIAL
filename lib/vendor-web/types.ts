// Shapes the vendor web page reads from /api/vendor/*. They mirror docs/VENDOR_API.md and lib/vendor/state.ts.

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

/** The signed-in account as the server reads it from the ID token. */
export interface VendorAccount {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export interface VendorMeResponse {
  account: VendorAccount;
  vendor: VendorMe;
}

export interface VendorTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  orderId: string | null;
  createdAt: string;
  resolution: string | null;
  messages: { at: unknown; kind: unknown; text: unknown }[];
}

/** The application body, exactly the fields lib/vendor/validation.ts parseApplication reads. */
export interface ApplicationInput {
  storeName: string;
  ownerName: string;
  contactNumber: string;
  gstNumber?: string;
  businessRegistrationNumber?: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  servicePincodes: string[];
  operatingHours: { openTime: string; closeTime: string; isOpenToday: boolean };
  categories: string[];
  pan?: string;
  bank?: {
    holderName: string;
    bankName: string;
    ifsc: string;
    accLast4: string;
    upiVpa?: string;
  };
}
