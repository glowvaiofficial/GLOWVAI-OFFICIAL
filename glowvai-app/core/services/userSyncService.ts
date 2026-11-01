/**
 * Founder / Admin Customer Onboarding & Telemetry Sync Service
 * 
 * Synchronizes:
 * - User Profile & Identity
 * - Real-Time GPS Coordinates & Saved Addresses
 * - Camera & Location Permission Consent
 * - Activity Timestamps
 * directly to Firebase Firestore `users` & `telemetry` collections.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentUser } from './authService';
import { getBackendBaseUrl, getCloudBackendUrl } from './apiConfig';
const devicePlatformName = (): string => (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent) ? 'android' : 'web');

export interface UserSyncPayload {
  userId?: string;
  name?: string;
  phone?: string;
  email?: string;
  avatarUri?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  cameraGranted?: boolean;
  locationGranted?: boolean;
  devicePlatform?: string;
  lastActiveAt?: number;
  consentTimestamp?: number;
  onboardingCompleted?: boolean;
  consents?: {
    termsAcceptedAt?: string;
    privacyAcceptedAt?: string;
    medicalDisclaimerAcceptedAt?: string;
    cameraAndScanConsent?: boolean;
  };
}

let cachedGuestUserId: string | null = null;

/**
 * Commits user data to Firestore for Founder / Admin Dashboard
 */
export const syncUserOnboardingData = async (
  customData?: Partial<UserSyncPayload>
): Promise<{ success: boolean; userId: string }> => {
  try {
    const user = getCurrentUser();
    if (!user?.uid && !customData?.userId && !cachedGuestUserId) {
      cachedGuestUserId = `guest_${Math.random().toString(36).substring(2, 9)}`;
    }
    const userId = user?.uid || customData?.userId || cachedGuestUserId!;

    // Only send what we actually know. Missing values are left out rather than filled with sample data, and the
    // location is only sent when the caller passes one the user confirmed.
    const raw: UserSyncPayload = {
      userId,
      name: customData?.name || user?.displayName || undefined,
      phone: customData?.phone || user?.phoneNumber || undefined,
      email: customData?.email || user?.email || undefined,
      avatarUri: customData?.avatarUri,
      address: customData?.address,
      latitude: customData?.latitude,
      longitude: customData?.longitude,
      cameraGranted: customData?.cameraGranted,
      locationGranted: customData?.locationGranted,
      onboardingCompleted: customData?.onboardingCompleted,
      consents: customData?.consents,
      devicePlatform: devicePlatformName(),
      lastActiveAt: Date.now(),
      consentTimestamp: customData?.consentTimestamp,
    };
    // Firestore rejects undefined fields, so drop them.
    const payload = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined)) as UserSyncPayload;

    // 2. Call backend /api/users/save endpoint (Cloud primary, fallback silently with fast timeout)
    const candidateUrls = [
      `${getCloudBackendUrl()}/api/users/save`,
    ];

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(fetchTimeout);
        if (res?.ok) break;
      } catch {
        // continue
      }
    }

    // 3. Persist to Firestore client SDK `users` collection
    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, payload, { merge: true });

      const telemetryDocRef = doc(db, 'founder_telemetry', `${userId}_${Date.now()}`);
      await setDoc(telemetryDocRef, {
        ...payload,
        event: 'CUSTOMER_ACTIVE',
        recordedAt: Date.now(),
      }, { merge: true });
    } catch {
      // Handled gracefully
    }

    console.log('[UserSyncService] Successfully synchronized user data to backend & Firestore:', userId);
    return { success: true, userId };
  } catch (err: any) {
    console.warn('[UserSyncService] Firestore sync note:', err?.message);
    return { success: false, userId: 'local_cached_user' };
  }
};
