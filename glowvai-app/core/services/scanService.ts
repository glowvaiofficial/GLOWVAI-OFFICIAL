/**
 * AI Skin Diagnostic Service for GlowVAI V2
 * 
 * Computes biometric facial metrics for Acne, Hydration, Texture,
 * Pigmentation, Sebum Balance, and compiles the overall Glow Score.
 * Routes directly to Render-hosted CNN model and syncs results to Cloud Firestore.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SkinScanReport } from '../types/scan';
import { runCnnSkinInference } from './aiSkinModelService';
import { getDeviceCurrentLocation } from './locationService';
import { getCurrentUser } from './authService';

let latestCachedReport: SkinScanReport | null = null;

export const analyzeFaceScan = async (imageUri?: string): Promise<SkinScanReport> => {
  // 1. Run live CNN inference on Render cloud model
  const report = await runCnnSkinInference(imageUri);
  latestCachedReport = report;

  // 2. Fetch location data (if user granted consent)
  let userLocation: any = null;
  try {
    const locRes = await getDeviceCurrentLocation();
    if (locRes && locRes.latitude) {
      userLocation = {
        latitude: locRes.latitude,
        longitude: locRes.longitude,
        countryCode: locRes.countryCode || 'IN',
        city: locRes.city || 'Vijayawada',
        timestamp: Date.now(),
      };
    }
  } catch (locErr) {
    console.warn('[ScanService] Location fetch note (non-fatal):', locErr);
  }

  // 3. Persist face scan data, timestamp, and location into Firebase Firestore
  try {
    const currentUser = getCurrentUser();
    const userId = currentUser ? currentUser.uid : report.userId;

    const scanPayload = {
      scanId: report.scanId,
      userId,
      overallScore: report.overallScore,
      skinType: report.skinType,
      metrics: report.metrics,
      primaryConcerns: report.primaryConcerns,
      recommendedRoutineIds: report.recommendedRoutineIds,
      scannedAt: report.scannedAt || Date.now(),
      location: userLocation,
      consentRecorded: true,
      syncedToFirebaseAt: Date.now(),
    };

    const scanDocRef = doc(db, 'scans', report.scanId);
    await setDoc(scanDocRef, scanPayload, { merge: true });

    if (userId && userId !== 'guest_user') {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        latestScan: scanPayload,
        lastActiveAt: Date.now(),
      }, { merge: true });
    }
  } catch (firestoreErr) {
    console.warn('[ScanService] Firestore sync note (non-fatal):', firestoreErr);
  }

  return report;
};

export const getLatestSkinReport = (): SkinScanReport | null => {
  return latestCachedReport;
};

export const setLatestSkinReport = (report: SkinScanReport) => {
  latestCachedReport = report;
};
