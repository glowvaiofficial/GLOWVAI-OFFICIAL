// The Firebase web SDK for the vendor page. Public web config only (NEXT_PUBLIC_FIREBASE_*); no secrets reach the browser.
// The app has its own name so its sign-in session never mixes with anything else on this origin.

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export const VENDOR_APP_NAME = "glowvai-vendor-web";

// Next.js inlines NEXT_PUBLIC_* only when the property is read literally, so each one is spelled out here.
function webConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  };
}

let cached: { app: FirebaseApp; auth: Auth } | null = null;

/** The vendor page's Firebase Auth instance (created once, on first use in the browser). */
export function vendorAuth(): Auth {
  if (!cached) {
    const app = getApps().some((a) => a.name === VENDOR_APP_NAME) ? getApp(VENDOR_APP_NAME) : initializeApp(webConfig(), VENDOR_APP_NAME);
    cached = { app, auth: getAuth(app) };
  }
  return cached.auth;
}
