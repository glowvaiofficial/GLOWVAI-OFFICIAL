import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * GLOW VAI Secure Token Generator and Verifier.
 * Generates HMAC-SHA256 signed URL safe tokens for:
 * 1. Double opt-in newsletter confirmation (48h expiry).
 * 2. RFC 8058 compliant one-click unsubscribe links.
 */

function secret(): string {
  if (!env.UNSUBSCRIBE_SECRET) throw new Error("UNSUBSCRIBE_SECRET is not configured");
  return env.UNSUBSCRIBE_SECRET;
}

export function createUnsubscribeToken(email: string, purpose: string = "marketing"): string {
  const cleanEmail = email.trim().toLowerCase();
  const timestamp = Date.now();
  const payload = `${cleanEmail}:${purpose}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  const tokenRaw = `${payload}:${hmac}`;
  return Buffer.from(tokenRaw).toString("base64url");
}

export function verifyUnsubscribeToken(token: string): {
  valid: boolean;
  email?: string;
  purpose?: string;
  expired?: boolean;
} {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return { valid: false };

    const [email, purpose, timestampStr, hmac] = parts;
    const payload = `${email}:${purpose}:${timestampStr}`;
    const expectedHmac = crypto.createHmac("sha256", secret()).update(payload).digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return { valid: false };
    }

    return { valid: true, email, purpose };
  } catch {
    return { valid: false };
  }
}

export function createConfirmToken(email: string, expiresInMs: number = 48 * 3600 * 1000): string {
  const cleanEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + expiresInMs;
  const payload = `${cleanEmail}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  const tokenRaw = `${payload}:${hmac}`;
  return Buffer.from(tokenRaw).toString("base64url");
}

export function verifyConfirmToken(token: string): {
  valid: boolean;
  email?: string;
  expired?: boolean;
} {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false };

    const [email, expiresAtStr, hmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    const payload = `${email}:${expiresAtStr}`;
    const expectedHmac = crypto.createHmac("sha256", secret()).update(payload).digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return { valid: false };
    }

    if (Date.now() > expiresAt) {
      return { valid: false, expired: true, email };
    }

    return { valid: true, email };
  } catch {
    return { valid: false };
  }
}
