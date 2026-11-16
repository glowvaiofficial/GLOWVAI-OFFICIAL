import { NextRequest } from "next/server";
import { checkShared, clientIp, db, json } from "@/lib/shop/server";
import { httpSmsConfig, sendSms } from "@/lib/otp/httpsms";
import {
  COOLDOWN_SECONDS, EXPIRES_IN_SECONDS, OTP_COLLECTION, OTP_LIMITS, SMS_TEXT, cooldownLeft, codeHash, dailyCap,
  generateCode, maskPhone, newChallenge, normalisePhone, phoneHash,
} from "@/lib/otp/rules";

export const dynamic = "force-dynamic";

const busy = (error: string, retryAfterSeconds: number, status = 429) => {
  const res = json({ ok: false, error, retryAfterSeconds }, status);
  res.headers.set("Retry-After", String(retryAfterSeconds));
  return res;
};

// Sends a 6-digit sign-in code by SMS (httpSMS). Every SMS costs SIM credit, so limits run before any send:
// per IP, per phone (cooldown, hour, day) and a global daily cap. Only a keyed hash of the code is stored.
// Limits apply identically to every number and the reply never says whether an account exists.
export async function POST(req: NextRequest) {
  const cfg = httpSmsConfig();
  const secret = process.env.OTP_HMAC_SECRET?.trim();
  if (!cfg || !secret) return json({ ok: false, error: "OTP_NOT_CONFIGURED" }, 503);

  // IP limits first: spam is refused before the number is even read.
  const ip = clientIp(req);
  const ipH = await checkShared({ key: `otp-req-ip-h:${ip}`, ...OTP_LIMITS.ipPerHour });
  if (!ipH.allowed) return busy("TOO_MANY_REQUESTS", ipH.retryAfterSeconds);
  const ipD = await checkShared({ key: `otp-req-ip-d:${ip}`, ...OTP_LIMITS.ipPerDay });
  if (!ipD.allowed) return busy("TOO_MANY_REQUESTS", ipD.retryAfterSeconds);

  const body = (await req.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = normalisePhone(body?.phone);
  if (!phone) return json({ ok: false, error: "INVALID_PHONE" }, 400);

  const id = phoneHash(phone, secret);
  const ref = db().collection(OTP_COLLECTION).doc(id);
  const before = await ref.get();
  const wait = cooldownLeft(before.exists ? (before.data()?.lastSentAt as number) : undefined, Date.now());
  if (wait > 0) return busy("COOLDOWN", wait);

  const pH = await checkShared({ key: `otp-req-phone-h:${id}`, ...OTP_LIMITS.phonePerHour });
  if (!pH.allowed) return busy("TOO_MANY_REQUESTS", pH.retryAfterSeconds);
  const pD = await checkShared({ key: `otp-req-phone-d:${id}`, ...OTP_LIMITS.phonePerDay });
  if (!pD.allowed) return busy("TOO_MANY_REQUESTS", pD.retryAfterSeconds);
  const day = new Date().toISOString().slice(0, 10);
  const global = await checkShared({ key: `otp-req-global:${day}`, max: dailyCap(process.env.OTP_DAILY_CAP), windowMs: 24 * 60 * 60 * 1000 });
  if (!global.allowed) return busy("DAILY_LIMIT", global.retryAfterSeconds, 503);

  // Claim the send slot in one transaction (a double tap cannot send two codes), then send.
  const code = generateCode();
  const now = Date.now();
  const claimed = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (cooldownLeft(snap.exists ? (snap.data()?.lastSentAt as number) : undefined, now) > 0) return false;
    tx.set(ref, newChallenge(codeHash(phone, code, secret), now));
    return true;
  });
  if (!claimed) return busy("COOLDOWN", COOLDOWN_SECONDS);

  const sent = await sendSms(cfg, phone, SMS_TEXT(code));
  if (!sent.ok) {
    await ref.delete().catch(() => undefined); // nothing was delivered: free the slot so a retry is possible
    console.warn(`[otp] send failed (${sent.reason}) for ${maskPhone(phone)}`);
    return json({ ok: false, error: "SMS_FAILED" }, 502);
  }
  return json({ ok: true, cooldownSeconds: COOLDOWN_SECONDS, expiresInSeconds: EXPIRES_IN_SECONDS });
}
