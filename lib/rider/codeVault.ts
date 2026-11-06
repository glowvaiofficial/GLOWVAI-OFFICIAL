// The customer's delivery code is shown to the customer on their own order page, so it has to be recoverable. The order
// itself keeps only a salted hash. The plain code lives encrypted (AES-256-GCM, bound to the order id) in
// riderDeliveryCodes/{orderId}, which only the server reads, and that document is deleted when the delivery completes.
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCb } from "node:crypto";
import { riderSecret } from "./session";

let keyPromise: Promise<Buffer> | null = null;

function vaultKey(): Promise<Buffer> {
  if (!keyPromise) {
    const secret = riderSecret();
    keyPromise = new Promise((resolve, reject) => {
      scryptCb(secret, "glowvai-rider-delivery-code-vault-v1", 32, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key)));
    });
  }
  return keyPromise;
}

export interface SealedCode {
  ct: string;
  iv: string;
  tag: string;
}

export async function sealCode(code: string, orderId: string): Promise<SealedCode> {
  const key = await vaultKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(orderId));
  const ct = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return { ct: ct.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

/** The plain code, or null when the record is missing or does not open for this order. */
export async function openCode(sealed: unknown, orderId: string): Promise<string | null> {
  const s = sealed as Partial<SealedCode> | undefined;
  if (!s || typeof s.ct !== "string" || typeof s.iv !== "string" || typeof s.tag !== "string") return null;
  try {
    const key = await vaultKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(s.iv, "base64"));
    decipher.setAAD(Buffer.from(orderId));
    decipher.setAuthTag(Buffer.from(s.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(s.ct, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
