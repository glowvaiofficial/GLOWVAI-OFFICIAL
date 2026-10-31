"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AnnouncementBar } from "./AnnouncementBar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { StickyCtaBar } from "./StickyCtaBar";
import { WhatsAppButton } from "./WhatsAppButton";
import { ReferralCapture } from "./ReferralCapture";

interface HeaderAndFooterWrapperProps {
  children: React.ReactNode;
  city: string;
}

export function HeaderAndFooterWrapper({ children, city }: HeaderAndFooterWrapperProps) {
  const pathname = usePathname();

  // The shop runs the glowvai app shell, which has its own navigation and bottom bar.
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
