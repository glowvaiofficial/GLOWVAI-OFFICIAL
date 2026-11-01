/**
 * Vendor Types & Workflows for GlowVAI V2
 */

import { BaseUserDocument } from './user';

export type VendorApplicationStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface VendorOperatingHours {
  openTime: string;   // e.g. "08:00"
  closeTime: string;  // e.g. "22:00"
  isOpenToday: boolean;
}

export interface VendorInventoryItem {
  productId: string;
  stock: number;
  isAvailable: boolean;
  unitPriceOverride?: number;
  lastRestockedAt: number;
}

export interface VendorApplicationInput {
  storeName: string;
  ownerName: string;
  contactNumber: string;
  email: string;
  businessRegistrationNumber?: string;
  drugLicenseNumber?: string;
  gstNumber?: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  serviceZoneIds: string[];
  operatingHours: VendorOperatingHours;
}

export interface VendorApplicationDocument extends VendorApplicationInput {
  applicationId: string;
  applicantUid: string;
  status: VendorApplicationStatus;
  rejectionReason?: string;
  reviewedByAdminUid?: string;
  approvedByAdminUid?: string;
  approvedAt?: number;
  submittedAt: number;
  updatedAt: number;
}

export interface VendorDocument extends BaseUserDocument {
  role: 'vendor';
  vendorId: string;
  storeName: string;
  ownerName: string;
  contactNumber: string;
  businessRegistrationNumber?: string;
  drugLicenseNumber?: string;
  gstNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  serviceZoneIds: string[];
  operatingHours: VendorOperatingHours;
  applicationStatus: VendorApplicationStatus;
  rejectionReason?: string;
  approvedByAdminUid?: string;
  approvedAt?: number;
  isActive: boolean;
  averageFulfillmentTimeMinutes: number;
}
