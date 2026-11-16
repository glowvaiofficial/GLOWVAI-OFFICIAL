import { NextRequest } from "next/server";
import { adminAuth, checkShared, clientIp, db, json } from "@/lib/shop/server";
import { OTP_COLLECTION, OTP_LIMITS, codeHash, judgeAttempt, maskPhone, normalisePhone, phoneHash, type Challenge } from "@/lib/otp/rules";
import { otpCode } from "@/lib/shop/account/rules";

export const dynamic = "force-dynamic";

// Checks the SMS code and returns a Firebase custom token for the phone's account (existing uid reused).
export async function POST(req: NextRequest) {
  const secret = process.env.OTP_HMAC_SECRET?.trim();
  if (!secret) return json({ ok: false, error: "OTP_NOT_CONFIGURED" }, 503);

  const ipL = await checkShared({ key: `otp-verify-ip-h:${clientIp(req)}`, ...OTP_LIMITS.verifyIpPerHour });
  if (!ipL.allowed) {
    const res = json({ ok: false, error: "TOO_MANY_REQUESTS", retryAfterSeconds: ipL.retryAfterSeconds }, 429);
    res.headers.set("Retry-After", String(ipL.retryAfterSeconds));
    return res;
  }

  const body = (await req.json().catch(() => null)) as { phone?: unknown; code?: unknown } | null;
  const phone = normalisePhone(body?.phone);
  const code = otpCode(body?.code);
  if (!phone) return json({ ok: false, error: "INVALID_PHONE" }, 400);
  if (!code) return json({ ok: false, error: "INVALID_CODE" }, 400);

  const ref = db().collection(OTP_COLLECTION).doc(phoneHash(phone, secret));
  const candidate = codeHash(phone, code, secret);
  const outcome = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const stored = snap.exists ? (snap.data() as Challenge) : undefined;
    const out = judgeAttempt(stored, candidate, Date.now());
    if (out.kind === "ok" || out.kind === "expired") tx.delete(ref); // single use; expired is cleaned up
    else if (out.kind === "wrong" && stored) tx.update(ref, { attempts: stored.attempts + 1 });
    return out;
  });

  switch (outcome.kind) {
    case "missing":
    case "expired":
      return json({ ok: false, error: "CODE_EXPIRED" }, 400);
    case "locked":
      return json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, 429);
    case "wrong":
      return json({ ok: false, error: "CODE_WRONG", attemptsLeft: outcome.attemptsLeft }, 400);
  }

  try {
    const auth = adminAuth();
    let uid: string;
    try {
      uid = (await auth.getUserByPhoneNumber(phone)).uid;
    } catch (err) {
      if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
      uid = (await auth.createUser({ phoneNumber: phone })).uid;
    }
    return json({ ok: true, customToken: await auth.createCustomToken(uid, { otpPhone: phone, otpVia: "httpsms" }) });
  } catch {
    console.warn(`[otp] token issue failed for ${maskPhone(phone)}`);
    return json({ ok: false, error: "SIGN_IN_FAILED" }, 500);
  }
}
