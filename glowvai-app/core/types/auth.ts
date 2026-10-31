/**
 * Authentication and Authorization Types for GlowVAI V2
 */

export type UserRole = 'customer' | 'vendor' | 'admin';

export interface AuthUserState {
  uid: string;
  phoneNumber: string | null;
  email: string | null;
  role: UserRole;
  isAnonymous: boolean;
}

export interface CustomTokenClaims {
  role?: UserRole;
  admin?: boolean;
  vendorId?: string;
}

export interface PhoneAuthSession {
  verificationId: string;
  phoneNumber: string;
  verificationCodeSentAt: number;
}
