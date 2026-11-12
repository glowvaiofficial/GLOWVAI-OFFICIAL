"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AnnouncementBar } from "./AnnouncementBar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { StickyCtaBar } from "./StickyCtaBar";
import { WhatsAppButton } from "./WhatsAppButton";
import { ReferralCapture } from "./ReferralCapture";
import { isVendorPath } from "@/lib/vendor-web/chrome";

interface HeaderAndFooterWrapperProps {
  children: React.ReactNode;
  city: string;
}

export function HeaderAndFooterWrapper({ children, city }: HeaderAndFooterWrapperProps) {
  const pathname = usePathname();

  // The shop runs the glowvai app shell, which has its own navigation and bottom bar.
  // The rider page is a standalone tool for delivery partners: no site navigation or promotional bars.
  if (pathname?.startsWith("/rider")) {
    return <main id="main" className="flex-1">{children}</main>;
  }

  // The vendor store runs its own shell (VendorShell), with its own top bar and navigation.
  if (isVendorPath(pathname)) {
    return <main id="main" className="flex-1">{children}</main>;
  }

  if (pathname?.startsWith("/shop")) {
    return (
      <>
        <ReferralCapture />
        <main id="main" className="flex-1">{children}</main>
      </>
    );
  }

  return (
    <>
      <ReferralCapture />
      <AnnouncementBar city={city} />
      <Navbar />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <StickyCtaBar />
      <WhatsAppButton />
    </>
  );
}
