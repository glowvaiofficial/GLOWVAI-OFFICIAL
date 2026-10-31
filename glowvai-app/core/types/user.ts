/**
 * User and Profile Models for GlowVAI V2
 */

import { UserRole } from './auth';

export interface UserConsents {
  cameraAndScanConsent: boolean;
  termsAcceptedAt: number;
  privacyAcceptedAt: number;
  medicalDisclaimerAcceptedAt: number;
}

export interface UserAddress {
  addressId: string;
  label: 'HOME' | 'WORK' | 'COLLEGE' | 'OTHER' | 'Home' | 'Work' | 'Other';
  recipientName?: string;
  phoneNumber?: string;
  streetAddress: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode?: string;
  postalCode?: string;
  country?: string;
  fullAddress?: string;
  houseOrFlatNumber?: string;
  deliveryInstructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  isQuickCommerceServiceable?: boolean;
  zoneId?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface SkinProfile {
  skinType: 'OILY' | 'DRY' | 'COMBINATION' | 'NORMAL' | 'SENSITIVE';
  primaryConcerns: string[];
  lastScanAt?: number;
  diagnosticScores?: Record<string, number>;
}

export interface BaseUserDocument {
  uid: string;
  phoneNumber: string;
  role: UserRole;
  displayName: string | null;
  email: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerUserDocument extends BaseUserDocument {
  role: 'customer';
  ageGroup?: 'UNDER_18' | '18_24' | '25_34' | '35_44' | '45_PLUS';
  gender?: 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  skinProfile?: SkinProfile;
  isStudentVerified: boolean;
  studentCollege?: string;
  referralCode: string;
  referredByCode?: string | null;
  referralCoinBalance: number;
  consents: UserConsents;
}

export interface AdminUserDocument extends BaseUserDocument {
  role: 'admin';
  permissions: Array<'ALL' | 'MANAGE_VENDORS' | 'MANAGE_CATALOG' | 'MANAGE_ORDERS' | 'MANAGE_DELIVERY'>;
  isSuperAdmin: boolean;
}
