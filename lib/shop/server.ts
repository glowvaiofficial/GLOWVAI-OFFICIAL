// Server-only helpers for the shop's own API (/api/shop/*). The shop and the GlowVai admin panel share the Firebase
// project glowvai-38bde. Customers never write to the database from the browser: they call these routes, which check
// who they are (Firebase ID token), validate the input and write with the Admin SDK in the exact shape the admin reads.
import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

let app: App | undefined;

function adminApp(): App {
  if (app) return app;
  const existing = getApps().find((a) => a.name === "shop");
  if (existing) return (app = existing);
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set on the server.");
  const credentials = JSON.parse(raw.replace(/^﻿/, "").trim());
  app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, "shop");
  return app;
}

export function db(): Firestore {
  return getFirestore(adminApp());
}

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// The signed-in customer, from the Firebase ID token in the Authorization header. Anonymous sign-in counts: it gives
// every device a stable id, so its profile, orders and requests stay together.
export async function customerFrom(req: NextRequest): Promise<{ uid: string; anonymous: boolean } | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  try {
    const decoded = await getAuth(adminApp()).verifyIdToken(token);
    return { uid: decoded.uid, anonymous: decoded.firebase?.sign_in_provider === "anonymous" };
  } catch {
    return null;
  }
}

// Small per-instance limiter so one device cannot flood orders or tickets.
const hits = new Map<string, number[]>();
export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}

export const text = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Indian mobile number as 10 digits, or "" when it is not one.
export function indianMobile(v: unknown): string {
  const digits = text(v, 20).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}
