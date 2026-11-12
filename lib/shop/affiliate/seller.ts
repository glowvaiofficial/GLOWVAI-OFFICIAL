// The "Sell on GlowVai" entry. Sellers apply and manage orders in the GlowVai Vendor app; this only links to the vendor
// onboarding page the owner configures in VENDOR_APPLY_URL. Unset or invalid means the entry says applications open soon
// and shows no link: no URL is invented.
import { validateUrl } from "./url";

export const SELLER_CLOSED_MESSAGE = "Seller applications open soon.";
export const SELLER_STATEMENT = "Sellers apply and manage their orders in the GlowVai Vendor app.";

export type SellerEntry = { open: true; href: string } | { open: false; message: string };

export function sellerEntryFor(env: { VENDOR_APPLY_URL?: string | undefined }): SellerEntry {
  const checked = validateUrl(env.VENDOR_APPLY_URL, { httpsOnly: true });
  if (!checked.ok || !checked.url) return { open: false, message: SELLER_CLOSED_MESSAGE };
  return { open: true, href: checked.url };
}
