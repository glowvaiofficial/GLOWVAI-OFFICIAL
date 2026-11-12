// Which pages get the shop's site chrome (navbar, footer, sticky bars). Pure, so the rule can be tested.
// The vendor store has its own shell (components/vendor-web/Shell.tsx), so /vendor and everything under it gets none of it.

/** True for /vendor and any path under it. "/vendors" and "/vendorx" are not vendor pages. */
export function isVendorPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/vendor" || pathname.startsWith("/vendor/");
}
