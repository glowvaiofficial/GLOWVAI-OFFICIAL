// Server-only helpers for the shop's own API (/api/shop/*). The shop and the GlowVai admin panel share the Firebase
// project glowvai-38bde. Customers never write to the database from the browser: they call these routes, which check
// who they are (Firebase ID token), validate the input and write with the Admin SDK in the exact shape the admin reads.
import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, memoryCheck, type RateLimitResult } from "./rateLimit";

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

// Firebase Auth (Admin SDK) on the same app, for the vendor API's token checks.
export function adminAuth(): Auth {
  return getAuth(adminApp());
}

// Firebase Cloud Messaging (web push) on the same app. Used by lib/shop/notify.ts only.
export function messaging(): Messaging {
  return getMessaging(adminApp());
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

// Small per-instance limiter so one device cannot flood orders or tickets. Synchronous, so existing callers keep working.
// The counters are shared with the async limiter in ./rateLimit (in-memory path) and keyed by SHA-256 hash.
export function tooMany(key: string, max: number, windowMs: number): boolean {
  return !memoryCheck(key, max, windowMs).allowed;
}

// Input helpers live in ./text (no server imports) so the vendor API's pure modules and tests can use them too.
export { indianMobile, text } from "./text";

// The visitor's address as the platform reports it. Used to limit anonymous requests.
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

// Refuses a route when one visitor sends too many requests. Checked before anything else, so spam costs nothing.
export function limitByIp(req: NextRequest, route: string, max: number, windowMs = 60_000): NextResponse | null {
  return tooMany(`ip:${route}:${clientIp(req)}`, max, windowMs)
    ? json({ ok: false, error: "Too many requests. Please wait a minute and try again." }, 429)
    : null;
}

// Refuses a route when one signed-in customer sends too many requests.
export function limitByUser(uid: string, route: string, max: number, windowMs = 60_000): NextResponse | null {
  return tooMany(`user:${route}:${uid}`, max, windowMs)
    ? json({ ok: false, error: "Too many requests. Please wait a minute and try again." }, 429)
    : null;
}

// ---- Shared limiter (Upstash when configured, see ./rateLimit). Same keys and responses as the sync helpers above.

function limited(result: RateLimitResult, message: string): NextResponse | null {
  if (result.allowed) return null;
  const res = json({ ok: false, error: message }, 429);
  res.headers.set("Retry-After", String(result.retryAfterSeconds));
  return res;
}

// Async check for any key, used by routes that need a custom limit. True when the request is over the limit.
export async function overLimit(key: string, max: number, windowMs: number, shared: boolean): Promise<boolean> {
  if (!shared) return tooMany(key, max, windowMs);
  return !(await checkRateLimit({ key, max, windowMs })).allowed;
}

export async function limitByIpShared(req: NextRequest, route: string, max: number, windowMs = 60_000, message?: string): Promise<NextResponse | null> {
  const result = await checkRateLimit({ key: `ip:${route}:${clientIp(req)}`, max, windowMs });
  return limited(result, message ?? "Too many requests. Please try again later.");
}

export async function limitByUserShared(uid: string, route: string, max: number, windowMs = 60_000, message?: string): Promise<NextResponse | null> {
  const result = await checkRateLimit({ key: `user:${route}:${uid}`, max, windowMs });
  return limited(result, message ?? "Too many requests. Please try again later.");
}
