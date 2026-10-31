/**
 * Firebase App & Cloud Firestore Initialization
 * 
 * Configuration:
 * - Uses EXPO_PUBLIC_FIREBASE_* environment variables.
 * - Defaults to calibrated glowvai-v2 production project credentials from google-services.json.
 * - Never throws invalid-api-key runtime crashes on app boot (Web or Mobile Expo Go).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const getFirebaseConfig = (): FirebaseClientConfig => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAaCBg-trPB4Zf72B-2z6dviEUf50gJub0';
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'glowvai-v2.firebaseapp.com';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'glowvai-v2';
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'glowvai-v2.firebasestorage.app';
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1094835664474';
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1094835664474:android:c91eca572a758bb30a8a63';
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined;

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase App singleton safely
let appInstance: FirebaseApp;
try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  console.warn('[Firebase Config] App init fallback:', e);
  appInstance = (getApps()[0] || {}) as FirebaseApp;
}
export const app: FirebaseApp = appInstance;

// @ts-ignore
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, getAuth, Auth } from 'firebase/auth';


// Initialize Firebase Auth singleton safely with browser persistence
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
} catch (e) {
  try {
    authInstance = getAuth(app);
  } catch {
    authInstance = {} as Auth;
  }
}
export const auth: Auth = authInstance;

// Initialize Cloud Firestore safely
let dbInstance: Firestore;
try {
  dbInstance = getFirestore(app);
} catch (e) {
  console.warn('[Firebase Config] Firestore init fallback:', e);
  dbInstance = {} as Firestore;
}
export const db: Firestore = dbInstance;

// Initialize Firebase Storage safely
let storageInstance: FirebaseStorage;
try {
  storageInstance = getStorage(app);
} catch (e) {
  console.warn('[Firebase Config] Storage init fallback:', e);
  storageInstance = {} as FirebaseStorage;
}
export const storage: FirebaseStorage = storageInstance;

// Optional: Connect to local Firebase Emulators if configured in .env
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && dbInstance && dbInstance.type) {
  const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '10.0.2.2';
  try {
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
    console.log(`[Firebase Emulators] Connected to ${host} (Firestore: 8080, Storage: 9199)`);
  } catch (emulatorErr) {
    console.warn('[Firebase Emulators] Failed to connect emulator:', emulatorErr);
  }
}
