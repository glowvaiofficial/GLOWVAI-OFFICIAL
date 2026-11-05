// Plain input helpers shared by the shop and vendor APIs. No server imports, so they can be unit tested on their own.

export const text = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Indian mobile number as 10 digits, or "" when it is not one.
export function indianMobile(v: unknown): string {
  const digits = text(v, 20).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}
