"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Bell, Boxes, ChartColumn, ClipboardList, House, LifeBuoy, Lightbulb, ShieldCheck, UserRound, Wallet, type LucideProps } from "lucide-react";
import { signOutVendor, useVendorSession } from "@/lib/vendor-web/session";
import { VENDOR_HOME_ROUTES } from "@/lib/vendor-web/routing";
import { messageForError } from "@/lib/vendor-web/errors";
import { Notice } from "./ui/Notice";
import { Skeleton } from "./ui/Skeleton";

export interface VendorNavItem {
  href: string;
  label: string;
  icon: ComponentType<LucideProps>;
}

/** The store's navigation, in order. The operations team adds its pages here; the shell renders whatever is listed. */
export const VENDOR_NAV_ITEMS: readonly VendorNavItem[] = [
  { href: "/vendor", label: "Home", icon: House },
  { href: "/vendor/orders", label: "Orders", icon: ClipboardList },
  { href: "/vendor/inventory", label: "Inventory", icon: Boxes },
  { href: "/vendor/product-requests", label: "Requests", icon: Lightbulb },
  { href: "/vendor/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/vendor/earnings", label: "Earnings", icon: Wallet },
  { href: "/vendor/notifications", label: "Notifications", icon: Bell },
  { href: "/vendor/profile", label: "Profile", icon: UserRound },
  { href: "/vendor/support", label: "Support", icon: LifeBuoy },
  { href: "/vendor/security", label: "Security", icon: ShieldCheck },
];

/** True when `current` is this nav item or a page inside it. "/vendor" only matches itself. */
export function isNavActive(href: string, current: string | null | undefined): boolean {
  if (!current) return false;
  if (href === "/vendor") return current === "/vendor" || current === "/vendor/home";
  return current === href || current.startsWith(`${href}/`);
}

function NavLink({ item, active, variant }: { item: VendorNavItem; active: boolean; variant: "side" | "bottom" }) {
  const Icon = item.icon;
  if (variant === "bottom") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[56px] min-w-[68px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
          active ? "text-[#0057FB]" : "text-ink-muted"
        }`}
      >
        <Icon aria-hidden="true" width={20} height={20} />
        <span>{item.label}</span>
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
        active ? "bg-[#EAF2FF] text-[#0057FB]" : "text-ink-muted hover:bg-[#F3F4F6] hover:text-ink"
      }`}
    >
      <Icon aria-hidden="true" width={20} height={20} />
      <span>{item.label}</span>
    </Link>
  );
}

/**
 * The signed-in frame for store pages: top bar (logo and store name), side navigation on desktop, bottom navigation on
 * phones. Sends signed-out visitors to sign-in and unverified accounts to the email check. Store-state routing is the
 * page's job (see /vendor).
 */
export function VendorShell({ children, active }: { children: ReactNode; active?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useVendorSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  // Pages pass a short name ("orders"); the nav matches on the full path, so map it to "/vendor/<name>".
  const current = active ? `/vendor/${active}` : pathname;
  const storeName = session.me?.application?.storeName || "Your store";

  useEffect(() => {
    if (session.authPhase === "signed-out") router.replace(VENDOR_HOME_ROUTES.signIn);
    else if (session.account && !session.account.emailVerified) router.replace(VENDOR_HOME_ROUTES.verifyEmail);
  }, [session.authPhase, session.account, router]);

  const blocked = session.authPhase !== "signed-in" || (session.account !== null && !session.account.emailVerified);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOutVendor();
      router.replace(VENDOR_HOME_ROUTES.signIn);
    } catch (err) {
      setSignOutError(messageForError(err));
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/vendor" className="flex min-h-[44px] items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/glowvai-logo.svg" alt="GlowVai" width={28} height={28} />
            <span className="truncate text-[15px] font-semibold">{storeName}</span>
          </Link>
          {session.authPhase === "signed-in" ? (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="min-h-[44px] rounded-xl px-3 text-[14px] font-semibold text-[#0057FB] hover:bg-[#EAF2FF] disabled:opacity-60"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          ) : null}
        </div>
        {signOutError ? (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <Notice>{signOutError}</Notice>
          </div>
        ) : null}
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 pb-28 pt-6 md:pb-12">
        <nav aria-label="Store" className="hidden w-56 shrink-0 flex-col gap-1 md:flex">
          {VENDOR_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={isNavActive(item.href, current)} variant="side" />
          ))}
        </nav>
        <main id="main" className="min-w-0 flex-1">
          {blocked ? <Skeleton lines={4} /> : children}
        </main>
      </div>

      <nav aria-label="Store (phone)" className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white md:hidden">
        <div className="flex overflow-x-auto px-1 pb-[env(safe-area-inset-bottom)]">
          {VENDOR_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={isNavActive(item.href, current)} variant="bottom" />
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Centred card for the sign-in, create-account, reset and email-check screens (no store navigation). */
export function VendorAuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/glowvai-logo.svg" alt="GlowVai" width={32} height={32} />
          <span className="text-[15px] font-semibold">GlowVai store</span>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6 sm:p-7">
          <h1 className="text-[22px] font-semibold leading-snug">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
