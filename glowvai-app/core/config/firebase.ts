/**
 * Firebase app, Auth and Firestore for the shop (project glowvai-38bde).
 *
 * The web config comes only from NEXT_PUBLIC_FIREBASE_* environment variables, which Next.js writes into the
 * browser bundle at build time. There is no built-in fallback: if a required value is missing the shop stops with
 * an error naming it (next.config.js also refuses a Vercel production build without them).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, getAuth, Auth } from 'firebase/auth';

// Each variable is read by its full name so Next.js can inline it into the client bundle.
const required = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length > 0) {
  throw new Error(`The shop's Firebase settings are missing: ${missing.join(', ')}. Set them in the environment and rebuild.`);
}

const firebaseConfig = {
  apiKey: required.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: required.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: required.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: required.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth with browser persistence, so the anonymous shop session survives a reload. initializeAuth throws if Auth was
// already set up for this app (e.g. after a hot reload), in which case the existing instance is used.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
} catch {
  authInstance = getAuth(app);
}
export const auth: Auth = authInstance;

export const db: Firestore = getFirestore(app);

// Optional: connect to a local Firestore emulator when configured in .env.
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '10.0.2.2';
  try {
    connectFirestoreEmulator(db, host, 8080);
  } catch (emulatorErr) {
    console.warn('[Firebase Emulators] Failed to connect emulator:', emulatorErr);
  }
}
