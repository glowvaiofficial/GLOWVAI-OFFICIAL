// Where the analytics/cookie notice must not render. Pure, so the rule can be tested.
// - /rider is a work tool: the banner would cover the deliveries.
// - Vendor pages (/vendor and everything under it) have no shop chrome, and the notice's
//   bottom offset would cover their sign-in and form controls. The shop's saved choice
//   (localStorage gv_consent) still applies there, because GA4Script reads it site-wide.
import { isVendorPath } from "@/lib/vendor-web/chrome";

export function isCookieNoticeHidden(pathname: string | null | undefined): boolean {
  if (pathname?.startsWith("/rider")) return true;
  return isVendorPath(pathname);
}
