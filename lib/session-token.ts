// Session tokens for lib/session.ts: create and verify an HMAC-signed token. Pure (node:crypto only) so it can be tested
// without Next.js. The secret is SESSION_SECRET and must be at least 32 characters. There is no fallback: when the secret
// is missing or short, both createSessionToken and verifySessionToken throw SessionConfigError, so no session is created
// or accepted.
import { createHmac, timingSafeEqual } from "crypto";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MIN_SECRET_LENGTH = 32;

// The message names the setting only. It holds no session, customer or request data.
export class SessionConfigError extends Error {
  constructor() {
    super("Server session configuration error: SESSION_SECRET must be set to at least 32 characters.");
    this.name = "SessionConfigError";
  }
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) throw new SessionConfigError();
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionToken(sessionId: string): string {
  const secret = getSecret();
  const expiresAt = Date.now() + TWO_HOURS_MS;
  const payload = `${sessionId}:${expiresAt}`;
  const signature = sign(payload, secret);
  return `${payload}:${signature}`;
}

export function verifySessionToken(token: string): { valid: boolean; sessionId?: string } {
  const secret = getSecret();
  if (!token || typeof token !== "string") return { valid: false };

  const parts = token.split(":");
  if (parts.length !== 3) return { valid: false };

  const [sessionId, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false };
  }

  const expectedSignature = sign(`${sessionId}:${expiresAtStr}`, secret);

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false };
    }
  } catch {
    return { valid: false };
  }

  return { valid: true, sessionId };
}
